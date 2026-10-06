"""Webhook signature verification via verify-webhook-signature."""

from fastapi import Request
from app.paypal.client import PayPalClient
from app.config import get_settings

async def verify_webhook_signature(client: PayPalClient, request: Request, raw_body: str) -> bool:
    """Verify PayPal webhook signature."""
    settings = get_settings()
    if not settings.paypal_webhook_id:
        # If webhook ID is not configured, we might be in simulation mode or it's misconfigured
        return False

    headers = request.headers
    
    # Required headers for PayPal webhook verification
    auth_algo = headers.get("paypal-auth-algo")
    cert_url = headers.get("paypal-cert-url")
    transmission_id = headers.get("paypal-transmission-id")
    transmission_sig = headers.get("paypal-transmission-sig")
    transmission_time = headers.get("paypal-transmission-time")
    
    if not all([auth_algo, cert_url, transmission_id, transmission_sig, transmission_time]):
        return False

    payload = {
        "auth_algo": auth_algo,
        "cert_url": cert_url,
        "transmission_id": transmission_id,
        "transmission_sig": transmission_sig,
        "transmission_time": transmission_time,
        "webhook_id": settings.paypal_webhook_id,
        "webhook_event": raw_body,
    }

    try:
        result = await client.request(
            "POST",
            "/v1/notifications/verify-webhook-signature",
            json=payload,
        )
        return result.get("verification_status") == "SUCCESS"
    except Exception:
        return False
