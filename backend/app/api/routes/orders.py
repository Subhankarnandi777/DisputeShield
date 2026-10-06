"""Create/capture sandbox orders for the demo storefront."""

from fastapi import APIRouter
from pydantic import BaseModel
from app.paypal.client import PayPalClient
from app.paypal.orders import create_order, capture_order

router = APIRouter(prefix="/orders", tags=["orders"])

class CreateOrderRequest(BaseModel):
    amount: str
    currency: str = "USD"

class CreateOrderResponse(BaseModel):
    order_id: str

class CaptureOrderResponse(BaseModel):
    status: str
    capture_id: str | None = None

@router.post("", response_model=CreateOrderResponse)
async def api_create_order(req: CreateOrderRequest):
    client = PayPalClient()
    result = await create_order(client, req.amount, req.currency)
    return CreateOrderResponse(order_id=result.get("id", ""))

@router.post("/{order_id}/capture", response_model=CaptureOrderResponse)
async def api_capture_order(order_id: str):
    client = PayPalClient()
    result = await capture_order(client, order_id)
    status = result.get("status", "")
    capture_id = None
    
    try:
        purchase_units = result.get("purchase_units", [])
        if purchase_units:
            payments = purchase_units[0].get("payments", {})
            captures = payments.get("captures", [])
            if captures:
                capture_id = captures[0].get("id")
    except Exception:
        pass
        
    return CaptureOrderResponse(status=status, capture_id=capture_id)
