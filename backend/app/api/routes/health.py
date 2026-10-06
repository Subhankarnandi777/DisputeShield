"""Health endpoints."""
from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "simulation_mode": get_settings().simulation_mode}


@router.get("/ready")
def ready() -> dict:
    # TODO: check DB, KB index, PayPal token reachability
    return {"status": "ready"}
