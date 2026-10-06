"""Fight-vs-accept decision engine (SRS section 2.9).

EV_fight = p*A - (1-p)*F - E      (value of fighting relative to accepting)
Fight when EV_fight > 0  <=>  p > (F + E) / (A + F)
"""
from dataclasses import dataclass
from decimal import Decimal

from app.decision.assumptions import BASE_RATES, P_MAX, P_MIN


@dataclass(frozen=True)
class Decision:
    recommendation: str  # "fight" | "accept"
    p_win: float
    ev_fight: Decimal
    threshold: float
    explanation: str


def estimate_p_win(category: str, evidence_score: float, adjustment: float = 0.0,
                   base_rates: dict[str, float] | None = None) -> float:
    rates = base_rates or BASE_RATES
    base = rates.get(category, rates["other"])
    evidence_score = min(max(evidence_score, 0.0), 1.0)
    p = base * (0.5 + 0.5 * evidence_score) + adjustment
    return min(max(p, P_MIN), P_MAX)


def decide(amount: Decimal, fee: Decimal, effort_cost: Decimal, p_win: float) -> Decision:
    a, f, e = Decimal(amount), Decimal(fee), Decimal(effort_cost)
    if a <= 0:
        raise ValueError("amount must be positive")
    p = Decimal(str(p_win))
    ev = p * a - (Decimal(1) - p) * f - e
    threshold = float((f + e) / (a + f))
    rec = "fight" if ev > 0 else "accept"
    explanation = (
        f"Win probability {p_win:.0%} vs break-even {threshold:.0%}. "
        f"Expected value of fighting = {p_win:.2f} x {a} - {1 - p_win:.2f} x {f} - {e} = {ev.quantize(Decimal('0.01'))}. "
        f"Recommendation: {rec}."
    )
    return Decision(rec, p_win, ev.quantize(Decimal("0.01")), threshold, explanation)
