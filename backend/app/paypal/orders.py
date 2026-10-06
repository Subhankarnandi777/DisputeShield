"""Orders v2: create and capture."""

from app.paypal.client import PayPalClient

async def create_order(client: PayPalClient, amount: str, currency: str = "USD") -> dict:
    """Create a PayPal Order for capture."""
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": currency,
                    "value": amount
                }
            }
        ]
    }
    return await client.request("POST", "/v2/checkout/orders", json=payload)

async def capture_order(client: PayPalClient, order_id: str, idempotency_key: str | None = None) -> dict:
    """Capture a created PayPal Order."""
    return await client.request(
        "POST", 
        f"/v2/checkout/orders/{order_id}/capture", 
        json={},
        idempotency_key=idempotency_key
    )
