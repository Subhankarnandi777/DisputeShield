"""Dispute list/detail/analyse/approve/reject/edit-draft endpoints."""
import json
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import AuditLogRow, DisputeRow, MerchantSettingsRow, get_db
from app.decision.engine import decide, estimate_p_win

router = APIRouter(prefix="/disputes", tags=["disputes"])


def _row_to_dict(d: DisputeRow) -> dict:
    return {
        "id": d.id,
        "paypal_dispute_id": d.paypal_dispute_id,
        "status": d.status,
        "reason": d.reason,
        "amount": d.amount,
        "currency": d.currency,
        "buyer_name": d.buyer_name,
        "buyer_email": d.buyer_email,
        "create_time": d.create_time.isoformat() if d.create_time else None,
        "update_time": d.update_time.isoformat() if d.update_time else None,
        "response_due_date": d.response_due_date.isoformat() if d.response_due_date else None,
        "is_simulated": d.is_simulated,
        "analysis_status": d.analysis_status,
        "classification": d.classification,
        "classification_confidence": d.classification_confidence,
        "classification_rationale": d.classification_rationale,
        "evidence_score": d.evidence_score,
        "evidence_score_breakdown": json.loads(d.evidence_score_breakdown or "{}"),
        "p_win": d.p_win,
        "ev_fight": d.ev_fight,
        "fight_threshold": d.fight_threshold,
        "recommendation": d.recommendation,
        "decision_explanation": d.decision_explanation,
        "evidence_narrative": d.evidence_narrative,
        "buyer_message_draft": d.buyer_message_draft,
        "missing_evidence": json.loads(d.missing_evidence or "[]"),
        "cited_passages": json.loads(d.cited_passages or "[]"),
        "tone": d.tone,
        "prompt_version": d.prompt_version,
        "action_taken": d.action_taken,
        "action_timestamp": d.action_timestamp.isoformat() if d.action_timestamp else None,
        "action_approved_by": d.action_approved_by,
        "outcome": d.outcome,
        "seller_message_to_buyer": d.seller_message_to_buyer,
    }


@router.get("")
def list_disputes(db: Session = Depends(get_db)):
    disputes = db.query(DisputeRow).order_by(DisputeRow.create_time.desc()).all()
    return [_row_to_dict(d) for d in disputes]


@router.get("/{dispute_id}")
def get_dispute(dispute_id: str, db: Session = Depends(get_db)):
    d = db.get(DisputeRow, dispute_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return _row_to_dict(d)


@router.get("/{dispute_id}/audit")
def get_audit_log(dispute_id: str, db: Session = Depends(get_db)):
    logs = db.query(AuditLogRow).filter(AuditLogRow.dispute_id == dispute_id).order_by(AuditLogRow.timestamp.asc()).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat(),
            "actor": l.actor,
            "action": l.action,
            "detail": l.detail,
        }
        for l in logs
    ]


class PatchDraftBody(BaseModel):
    evidence_narrative: Optional[str] = None
    buyer_message_draft: Optional[str] = None
    tone: Optional[str] = None


@router.patch("/{dispute_id}/draft")
def patch_draft(dispute_id: str, body: PatchDraftBody, db: Session = Depends(get_db)):
    d = db.get(DisputeRow, dispute_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if d.status not in ("READY", "ANALYSING"):
        raise HTTPException(status_code=400, detail="Draft can only be edited when status is READY or ANALYSING")
    changed = []
    if body.evidence_narrative is not None:
        d.evidence_narrative = body.evidence_narrative
        changed.append("evidence_narrative")
    if body.buyer_message_draft is not None:
        d.buyer_message_draft = body.buyer_message_draft
        changed.append("buyer_message_draft")
    if body.tone is not None:
        d.tone = body.tone
        changed.append("tone")
    d.update_time = datetime.utcnow()
    if changed:
        db.add(AuditLogRow(
            dispute_id=dispute_id,
            actor="merchant",
            action="draft_edited",
            detail=f"Merchant edited: {', '.join(changed)}",
        ))
    db.commit()
    return _row_to_dict(d)


class ApproveBody(BaseModel):
    action: str  # "fight" | "accept" | "offer"
    offer_amount: Optional[float] = None


@router.post("/{dispute_id}/approve")
def approve_action(dispute_id: str, body: ApproveBody, db: Session = Depends(get_db)):
    """Merchant approval gate — executes the action (or marks it as submitted in simulation)."""
    d = db.get(DisputeRow, dispute_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if d.status not in ("READY",):
        raise HTTPException(status_code=400, detail="Dispute must be in READY state to approve")
    if body.action not in ("fight", "accept", "offer"):
        raise HTTPException(status_code=400, detail="action must be fight, accept, or offer")

    now = datetime.utcnow()
    d.action_taken = body.action
    d.action_timestamp = now
    d.action_approved_by = "merchant"
    d.status = "SUBMITTED"
    d.update_time = now

    detail_map = {
        "fight": "Merchant approved: submit evidence and fight the dispute",
        "accept": "Merchant approved: accept claim and issue refund",
        "offer": f"Merchant approved: make partial offer of ${body.offer_amount or 0:.2f}",
    }
    db.add(AuditLogRow(
        dispute_id=dispute_id,
        actor="merchant",
        action="action_approved",
        detail=detail_map[body.action],
        timestamp=now,
    ))

    # In simulation mode, auto-resolve after approval
    if d.is_simulated:
        import random
        outcome = "WON" if (d.p_win or 0.5) > 0.45 else "LOST"
        d.status = "RESOLVED"
        d.outcome = outcome
        db.add(AuditLogRow(
            dispute_id=dispute_id,
            actor="system",
            action="dispute_resolved",
            detail=f"Dispute resolved: {outcome} (simulated outcome based on p_win={d.p_win:.0%})",
            timestamp=now,
        ))

    db.commit()
    return _row_to_dict(d)


@router.post("/{dispute_id}/reject")
def reject_action(dispute_id: str, db: Session = Depends(get_db)):
    """Merchant rejects the AI recommendation — returns to RECEIVED state."""
    d = db.get(DisputeRow, dispute_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    d.status = "RECEIVED"
    d.update_time = datetime.utcnow()
    db.add(AuditLogRow(
        dispute_id=dispute_id,
        actor="merchant",
        action="recommendation_rejected",
        detail="Merchant rejected the AI recommendation. Dispute returned to review queue.",
    ))
    db.commit()
    return _row_to_dict(d)


class WhatIfBody(BaseModel):
    fee: Optional[float] = None
    effort_cost: Optional[float] = None
    p_win_override: Optional[float] = None
    offer_amount: Optional[float] = None


@router.post("/{dispute_id}/whatif")
def whatif_simulator(dispute_id: str, body: WhatIfBody, db: Session = Depends(get_db)):
    """What-if simulator: change assumptions and get a new decision."""
    d = db.get(DisputeRow, dispute_id)
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    settings = db.get(MerchantSettingsRow, 1)
    fee = Decimal(str(body.fee if body.fee is not None else (settings.dispute_fee if settings else 20.0)))
    effort = Decimal(str(body.effort_cost if body.effort_cost is not None else (settings.effort_cost if settings else 5.0)))
    p_win = body.p_win_override if body.p_win_override is not None else (d.p_win or 0.5)
    amount = Decimal(str(d.amount))
    decision = decide(amount, fee, effort, p_win)
    return {
        "recommendation": decision.recommendation,
        "p_win": decision.p_win,
        "ev_fight": float(decision.ev_fight),
        "threshold": decision.threshold,
        "explanation": decision.explanation,
        "inputs": {"amount": float(amount), "fee": float(fee), "effort_cost": float(effort), "p_win": p_win},
    }
