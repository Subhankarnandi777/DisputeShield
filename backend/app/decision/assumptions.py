"""Configurable ASSUMPTIONS (not PayPal statistics). Label as assumptions everywhere they are shown."""
from decimal import Decimal

DEFAULT_FEE = Decimal("20.00")
DEFAULT_EFFORT_COST = Decimal("5.00")

# Illustrative base win rates per category if evidence were perfect-ish. Tune/override in settings.
BASE_RATES: dict[str, float] = {
    "item_not_received": 0.60,
    "not_as_described": 0.40,
    "unauthorized": 0.30,
    "duplicate": 0.50,
    "other": 0.35,
}
P_MIN, P_MAX = 0.02, 0.95
