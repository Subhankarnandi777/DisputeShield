from decimal import Decimal

import pytest

from app.decision.engine import decide, estimate_p_win


def test_fights_when_p_above_threshold():
    d = decide(Decimal("100"), Decimal("20"), Decimal("5"), 0.8)
    assert d.recommendation == "fight"
    assert d.ev_fight > 0


def test_accepts_when_p_below_threshold():
    d = decide(Decimal("10"), Decimal("20"), Decimal("5"), 0.3)
    assert d.recommendation == "accept"


def test_threshold_formula():
    d = decide(Decimal("100"), Decimal("20"), Decimal("5"), 0.5)
    assert d.threshold == pytest.approx(25 / 120)


def test_p_win_is_clamped():
    assert estimate_p_win("item_not_received", 1.0, adjustment=5.0) <= 0.95
    assert estimate_p_win("item_not_received", 0.0, adjustment=-5.0) >= 0.02


def test_invalid_amount():
    with pytest.raises(ValueError):
        decide(Decimal("0"), Decimal("20"), Decimal("5"), 0.5)
