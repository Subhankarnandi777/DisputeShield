"""POST /webhooks/paypal: verify signature, dedupe on event id, store raw event."""
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import AuditLogRow, DisputeRow, WebhookEventRow, get_db
from app.paypal.client import PayPalClient
from app.paypal.webhooks import verify_webhook_signature

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/paypal")
async def paypal_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """Receive and process PayPal webhook events."""
    raw_body = await request.body()
    raw_str = raw_body.decode("utf-8")

    settings = get_settings()

    # Verify signature (skip in simulation mode)
    if not settings.simulation_mode and settings.paypal_webhook_id:
        client = PayPalClient()
        verified = await verify_webhook_signature(client, request, raw_str)
        if not verified:
            raise HTTPException(status_code=400, detail="Webhook signature verification failed")

    try:
        event = json.loads(raw_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_id = event.get("id", "")
    event_type = event.get("event_type", "")

    # Idempotent deduplication
    if event_id and db.get(WebhookEventRow, event_id):
        return {"status": "duplicate", "event_id": event_id}

    # Store event
    db.add(WebhookEventRow(event_id=event_id or "unknown", event_type=event_type, raw_body=raw_str, processed=False))

    # Handle dispute events
    if event_type.startswith("CUSTOMER.DISPUTE."):
        resource = event.get("resource", {})
        dispute_id = resource.get("dispute_id", "")
        if dispute_id:
            existing = db.query(DisputeRow).filter(DisputeRow.paypal_dispute_id == dispute_id).first()
            if not existing:
                from datetime import datetime, timedelta
                dispute = DisputeRow(
                    id=dispute_id,
                    paypal_dispute_id=dispute_id,
                    status="RECEIVED",
                    reason=resource.get("reason", "OTHER"),
                    amount=float(resource.get("dispute_amount", {}).get("value", 0)),
                    currency=resource.get("dispute_amount", {}).get("currency_code", "USD"),
                    buyer_name="",
                    buyer_email="",
                    create_time=datetime.utcnow(),
                    response_due_date=datetime.utcnow() + timedelta(days=10),
                    raw_paypal_json=json.dumps(resource),
                    analysis_status="pending",
                    is_simulated=False,
                )
                db.add(dispute)
                db.add(AuditLogRow(
                    dispute_id=dispute_id,
                    actor="system",
                    action="dispute_received",
                    detail=f"Webhook: {event_type}",
                ))

    db.commit()
    return {"status": "ok", "event_id": event_id, "event_type": event_type}
