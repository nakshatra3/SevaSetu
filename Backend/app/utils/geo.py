"""Location and time-slot helpers."""

import math
from datetime import datetime

# The same labels are used on the volunteer profile form (frontend constants.js).
TIME_SLOTS = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends"]


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance between two points on Earth (haversine formula)."""
    earth_radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return round(2 * earth_radius_km * math.asin(math.sqrt(a)), 2)


def time_slot_for(start: datetime) -> str:
    """Which availability slot an event falls in, based on its start time."""
    if start.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
        return "Weekends"
    if start.hour < 12:
        return "Weekday mornings"
    if start.hour < 17:
        return "Weekday afternoons"
    return "Weekday evenings"


def has_location(item: dict) -> bool:
    return item.get("latitude") is not None and item.get("longitude") is not None
