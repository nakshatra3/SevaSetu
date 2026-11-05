"""Geographic helpers used by event discovery."""

import math


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return the great-circle distance between two coordinates in kilometres."""
    earth_radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    # Clamp against tiny floating-point overshoots before asin.
    a = min(1.0, max(0.0, a))
    return round(2 * earth_radius_km * math.asin(math.sqrt(a)), 2)


def has_location(item: dict) -> bool:
    """Return whether an event has both coordinates."""
    return item.get("latitude") is not None and item.get("longitude") is not None
