"""PayPal Disputes API: list, get, provide-evidence, accept-claim, make-offer, send-message."""
import uuid
from app.paypal.client import PayPalClient


async def list_disputes(client: PayPalClient, page_size: int = 20) -> dict:
    """List open disputes from PayPal."""
    return await client.request(
        "GET",
        "/v1/customer/disputes",
        params={"page_size": page_size, "dispute_state": "REQUIRED_ACTION"},
    )


async def get_dispute(client: PayPalClient, dispute_id: str) -> dict:
    """Fetch full dispute details."""
    return await client.request("GET", f"/v1/customer/disputes/{dispute_id}")


async def provide_evidence(client: PayPalClient, dispute_id: str, evidence_text: str) -> dict:
    """Submit evidence for a dispute."""
    payload = {
        "evidences": [
            {
                "evidence_type": "PROOF_OF_FULFILLMENT",
                "notes": evidence_text,
            }
        ]
    }
    return await client.request(
        "POST",
        f"/v1/customer/disputes/{dispute_id}/provide-evidence",
        json=payload,
        idempotency_key=f"evidence-{dispute_id}-{uuid.uuid4()}",
    )


async def accept_claim(client: PayPalClient, dispute_id: str, note: str = "") -> dict:
    """Accept the buyer's claim (issue refund)."""
    payload = {"note": note or "Merchant accepts the claim and will issue a refund."}
    return await client.request(
        "POST",
        f"/v1/customer/disputes/{dispute_id}/accept-claim",
        json=payload,
        idempotency_key=f"accept-{dispute_id}",
    )


async def make_offer(client: PayPalClient, dispute_id: str, amount: str, currency: str = "USD", note: str = "") -> dict:
    """Make a partial refund offer to the buyer."""
    payload = {
        "offer_amount": {"currency_code": currency, "value": amount},
        "offer_type": "REFUND",
        "note": note or "Merchant offers a partial refund.",
    }
    return await client.request(
        "POST",
        f"/v1/customer/disputes/{dispute_id}/make-offer",
        json=payload,
        idempotency_key=f"offer-{dispute_id}-{uuid.uuid4()}",
    )


async def send_message(client: PayPalClient, dispute_id: str, message: str) -> dict:
    """Send a message to the buyer through the dispute thread."""
    payload = {"message": message}
    return await client.request(
        "POST",
        f"/v1/customer/disputes/{dispute_id}/send-message",
        json=payload,
        idempotency_key=f"msg-{dispute_id}-{uuid.uuid4()}",
    )
