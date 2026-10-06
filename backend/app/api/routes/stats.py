"""Dashboard metrics endpoint."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import DisputeRow, get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    """Return dashboard summary statistics."""
    all_disputes = db.query(DisputeRow).all()

    total = len(all_disputes)
    open_disputes = [d for d in all_disputes if d.status not in ("RESOLVED",)]
    resolved = [d for d in all_disputes if d.status == "RESOLVED"]
    money_at_risk = sum(d.amount for d in open_disputes)

    won = [d for d in resolved if d.outcome == "WON"]
    lost = [d for d in resolved if d.outcome == "LOST"]
    win_rate = (len(won) / len(resolved) * 100) if resolved else 0
    money_recovered = sum(d.amount for d in won)
    money_lost = sum(d.amount for d in lost)

    # Avg response time (hours from create to action taken)
    action_times = []
    for d in resolved:
        if d.action_timestamp and d.create_time:
            delta = (d.action_timestamp - d.create_time).total_seconds() / 3600
            action_times.append(delta)
    avg_response_hours = (sum(action_times) / len(action_times)) if action_times else 0

    # Deadline urgency
    now = datetime.utcnow()
    urgent = [
        d for d in open_disputes
        if d.response_due_date and (d.response_due_date - now).total_seconds() < 86400 * 3
    ]

    # By recommendation
    fight_count = len([d for d in open_disputes if d.recommendation == "fight"])
    accept_count = len([d for d in open_disputes if d.recommendation == "accept"])
    pending_analysis = len([d for d in open_disputes if d.analysis_status in ("pending", "running")])

    return {
        "total_disputes": total,
        "open_disputes": len(open_disputes),
        "resolved_disputes": len(resolved),
        "win_rate": round(win_rate, 1),
        "money_at_risk": round(money_at_risk, 2),
        "money_recovered": round(money_recovered, 2),
        "money_lost": round(money_lost, 2),
        "avg_response_hours": round(avg_response_hours, 1),
        "urgent_disputes": len(urgent),
        "fight_recommended": fight_count,
        "accept_recommended": accept_count,
        "pending_analysis": pending_analysis,
    }
