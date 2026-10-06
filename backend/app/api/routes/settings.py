"""Merchant assumptions settings — GET/PATCH."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import MerchantSettingsRow, get_db

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    dispute_fee: float
    effort_cost: float
    base_rate_item_not_received: float
    base_rate_not_as_described: float
    base_rate_unauthorized: float
    base_rate_duplicate: float
    base_rate_other: float


class SettingsUpdate(BaseModel):
    dispute_fee: float | None = None
    effort_cost: float | None = None
    base_rate_item_not_received: float | None = None
    base_rate_not_as_described: float | None = None
    base_rate_unauthorized: float | None = None
    base_rate_duplicate: float | None = None
    base_rate_other: float | None = None


@router.get("", response_model=SettingsResponse)
def get_settings_route(db: Session = Depends(get_db)):
    row = db.get(MerchantSettingsRow, 1)
    if not row:
        row = MerchantSettingsRow(id=1)
        db.add(row)
        db.commit()
    return SettingsResponse(
        dispute_fee=row.dispute_fee,
        effort_cost=row.effort_cost,
        base_rate_item_not_received=row.base_rate_item_not_received,
        base_rate_not_as_described=row.base_rate_not_as_described,
        base_rate_unauthorized=row.base_rate_unauthorized,
        base_rate_duplicate=row.base_rate_duplicate,
        base_rate_other=row.base_rate_other,
    )


@router.patch("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    row = db.get(MerchantSettingsRow, 1)
    if not row:
        row = MerchantSettingsRow(id=1)
        db.add(row)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return SettingsResponse(
        dispute_fee=row.dispute_fee,
        effort_cost=row.effort_cost,
        base_rate_item_not_received=row.base_rate_item_not_received,
        base_rate_not_as_described=row.base_rate_not_as_described,
        base_rate_unauthorized=row.base_rate_unauthorized,
        base_rate_duplicate=row.base_rate_duplicate,
        base_rate_other=row.base_rate_other,
    )
