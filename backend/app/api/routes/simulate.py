"""Complete simulate route — creates a realistic fixture dispute in the local DB."""
import json
import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import AuditLogRow, DisputeRow, get_db

router = APIRouter(prefix="/simulate", tags=["simulate"])

FIXTURES = [
    {
        "reason": "ITEM_NOT_RECEIVED",
        "amount": 149.99,
        "buyer_name": "Jordan Lee",
        "buyer_email": "j.l***@example.com",
        "description": "Buyer claims the vintage camera lens was never delivered.",
        "classification": "item_not_received",
        "classification_confidence": 0.91,
        "classification_rationale": "Buyer explicitly states the item was not received and provided a tracking screenshot showing 'In Transit'. Reason code maps directly to ITEM_NOT_RECEIVED.",
        "evidence_score": 0.72,
        "evidence_score_breakdown": {
            "tracking_proof": 0.8,
            "delivery_confirmation": 0.0,
            "communication_log": 0.9,
            "item_description_match": 1.0,
        },
        "p_win": 0.65,
        "ev_fight": 67.50,
        "fight_threshold": 0.12,
        "recommendation": "fight",
        "decision_explanation": "Win probability 65% vs break-even 12%. Expected value of fighting = 0.65 × 149.99 − 0.35 × 20.00 − 5.00 = +$81.49. Recommendation: fight.",
        "evidence_narrative": "On 2026-09-15 the merchant shipped order #PP-123456 via FedEx tracking 794644790003. The package shows status 'In Transit — Delayed' due to a carrier sortation issue, not failure to ship. The merchant has attached the shipping label, the carrier scan history showing pick-up, and all communications with the buyer dated September 16–22 in which the merchant proactively updated the buyer. Evidence supports the seller acted in good faith and the delay is carrier-caused.",
        "buyer_message_draft": "Dear Jordan, thank you for reaching out about your order. I understand your frustration with the delay. I shipped your vintage camera lens on September 15th via FedEx (tracking: 794644790003). According to FedEx, the package encountered a sortation delay but is still in transit and should arrive within 2-3 business days. I've attached the shipping confirmation, carrier scans, and our message history. I'm happy to assist further once delivery is confirmed. Sincerely, The Seller.",
        "missing_evidence": ["Delivery confirmation (final scan)", "Carrier delay certificate"],
        "cited_passages": [
            {"source": "PayPal Seller Protection Policy §3.1", "text": "Sellers are eligible for Seller Protection on Item Not Received claims when they can show Proof of Shipment or Proof of Delivery."},
            {"source": "PayPal Dispute Resolution Guide §7.2", "text": "Carrier delays outside the seller's control do not automatically disqualify Seller Protection eligibility provided shipping was initiated within the stated handling time."},
        ],
        "tone": "professional",
        "response_days": 14,
    },
    {
        "reason": "NOT_AS_DESCRIBED",
        "amount": 89.00,
        "buyer_name": "Alex Rivera",
        "buyer_email": "a.r***@example.com",
        "description": "Buyer says the handmade pottery arrived cracked and not matching listing photos.",
        "classification": "not_as_described",
        "classification_confidence": 0.85,
        "classification_rationale": "Buyer provided photos showing cracks inconsistent with listing images. This is a clear 'item significantly not as described' scenario.",
        "evidence_score": 0.38,
        "evidence_score_breakdown": {
            "listing_accuracy": 0.5,
            "packaging_proof": 0.2,
            "condition_on_dispatch": 0.3,
            "return_policy_disclosure": 0.6,
        },
        "p_win": 0.28,
        "ev_fight": -15.40,
        "fight_threshold": 0.23,
        "recommendation": "accept",
        "decision_explanation": "Win probability 28% vs break-even 23%. Expected value of fighting = 0.28 × 89.00 − 0.72 × 20.00 − 5.00 = −$15.40. Recommendation: accept (refund saves money).",
        "evidence_narrative": "The buyer has submitted photos of the item showing visible cracks along the rim that do not appear in the listing photographs. Without photographic evidence of the item's condition at dispatch or proof of adequate packaging, the evidence for the seller is weak. The merchant is advised to accept the claim to avoid the $20 dispute fee and protect seller rating.",
        "buyer_message_draft": "Dear Alex, I'm sincerely sorry to hear that your pottery arrived damaged. This is not the experience I want for my customers, and I take full responsibility for ensuring items are packaged securely. I've reviewed your photos and I agree this is not the quality I sell. I'm processing a full refund of $89.00 immediately, with no need to return the item. I hope you'll give me a chance to make this right in the future. Warmly, The Seller.",
        "missing_evidence": ["Dispatch photos with packaging intact", "Insurance claim from shipping carrier", "Listing photo metadata proving authenticity"],
        "cited_passages": [
            {"source": "PayPal Buyer Protection Policy §4.2", "text": "A buyer is entitled to a full refund when an item is significantly not as described, including damage that was not disclosed in the listing."},
            {"source": "PayPal Seller Protection Policy §2.1", "text": "Seller Protection does not cover claims where the item was materially different from the item described in the listing."},
        ],
        "tone": "empathetic",
        "response_days": 7,
    },
]


@router.post("")
def simulate_dispute(db: Session = Depends(get_db)):
    """Create a simulated dispute in the local DB with full AI analysis pre-populated."""
    fixture = random.choice(FIXTURES)
    dispute_id = f"PP-DISPUTE-SIM-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()

    dispute = DisputeRow(
        id=dispute_id,
        paypal_dispute_id=dispute_id,
        status="READY",
        reason=fixture["reason"],
        amount=fixture["amount"],
        currency="USD",
        buyer_name=fixture["buyer_name"],
        buyer_email=fixture["buyer_email"],
        create_time=now - timedelta(hours=random.randint(2, 48)),
        update_time=now,
        response_due_date=now + timedelta(days=fixture["response_days"]),
        is_simulated=True,
        raw_paypal_json=json.dumps({"description": fixture["description"]}),
        analysis_status="done",
        classification=fixture["classification"],
        classification_confidence=fixture["classification_confidence"],
        classification_rationale=fixture["classification_rationale"],
        evidence_score=fixture["evidence_score"],
        evidence_score_breakdown=json.dumps(fixture["evidence_score_breakdown"]),
        p_win=fixture["p_win"],
        ev_fight=fixture["ev_fight"],
        fight_threshold=fixture["fight_threshold"],
        recommendation=fixture["recommendation"],
        decision_explanation=fixture["decision_explanation"],
        evidence_narrative=fixture["evidence_narrative"],
        buyer_message_draft=fixture["buyer_message_draft"],
        missing_evidence=json.dumps(fixture["missing_evidence"]),
        cited_passages=json.dumps(fixture["cited_passages"]),
        tone=fixture["tone"],
        prompt_version="v1",
    )

    db.add(dispute)

    # Audit log entries
    for entry in [
        ("system", "dispute_received", f"Dispute {dispute_id} received from PayPal (simulated)"),
        ("agent", "analysis_started", "AI agent started classification and evidence analysis"),
        ("agent", "analysis_complete", f"Analysis done. Recommendation: {fixture['recommendation'].upper()}. Evidence score: {fixture['evidence_score']:.0%}"),
    ]:
        db.add(AuditLogRow(dispute_id=dispute_id, timestamp=now - timedelta(minutes=random.randint(1, 60)), actor=entry[0], action=entry[1], detail=entry[2]))

    db.commit()
    return {"dispute_id": dispute_id, "message": f"Simulated dispute created with recommendation: {fixture['recommendation']}"}
