import pytest
from httpx import Response
from app.paypal.client import PayPalClient
from app.paypal.orders import create_order, capture_order

@pytest.mark.asyncio
async def test_create_order(respx_mock):
    respx_mock.post("https://api-m.sandbox.paypal.com/v1/oauth2/token").mock(
        return_value=Response(200, json={"access_token": "mock-token", "expires_in": 3600})
    )
    respx_mock.post("https://api-m.sandbox.paypal.com/v2/checkout/orders").mock(
        return_value=Response(201, json={"id": "ORDER-123", "status": "CREATED"})
    )
    
    client = PayPalClient()
    result = await create_order(client, "100.00")
    assert result["id"] == "ORDER-123"

@pytest.mark.asyncio
async def test_capture_order(respx_mock):
    respx_mock.post("https://api-m.sandbox.paypal.com/v1/oauth2/token").mock(
        return_value=Response(200, json={"access_token": "mock-token", "expires_in": 3600})
    )
    respx_mock.post("https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-123/capture").mock(
        return_value=Response(201, json={
            "id": "ORDER-123",
            "status": "COMPLETED",
            "purchase_units": [
                {
                    "payments": {
                        "captures": [{"id": "CAPTURE-456"}]
                    }
                }
            ]
        })
    )
    
    client = PayPalClient()
    result = await capture_order(client, "ORDER-123")
    assert result["status"] == "COMPLETED"
    assert result["purchase_units"][0]["payments"]["captures"][0]["id"] == "CAPTURE-456"
