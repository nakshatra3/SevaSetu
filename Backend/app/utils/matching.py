"""Smart volunteer matching: a transparent weighted score (no machine learning).

score (0-100) = distance (30) + skills (25) + interests (20) + availability (15) + history (10)

  distance     : full 30 points at 0 km, falling to 0 points at 50 km.
                 If either side has no map location, 20 points for the same city.
  skills       : share of the event's required skills that the volunteer has.
                 Events that need no special skills get 10 points.
  interests    : 20 points if the event category is one of the volunteer's interests.
  availability : 15 points if the event time slot is in the volunteer's availability.
  history      : 10 points if they attended this category before,
                 5 points if they attended this organization before.
"""

from app.utils.geo import distance_km, has_location

WEIGHTS = {"distance": 30, "skills": 25, "interests": 20, "availability": 15, "history": 10}
MAX_DISTANCE_KM = 50


def lower_set(values) -> set:
    return {str(v).strip().lower() for v in values or [] if str(v).strip()}


def score_event(event: dict, profile: dict, past_categories: set, past_org_ids: set) -> dict:
    breakdown = {}
    reasons = []

    # 1. Distance
    distance = None
    if has_location(profile) and has_location(event):
        distance = distance_km(
            profile["latitude"], profile["longitude"], event["latitude"], event["longitude"]
        )
        breakdown["distance"] = max(0.0, 1 - distance / MAX_DISTANCE_KM) * WEIGHTS["distance"]
        if distance <= MAX_DISTANCE_KM:
            reasons.append(f"{distance} km from you")
    elif profile.get("city") and profile["city"].strip().lower() == event.get("city", "").strip().lower():
        breakdown["distance"] = 20
        reasons.append(f"In your city ({event['city']})")
    else:
        breakdown["distance"] = 0

    # 2. Skills
    required = lower_set(event.get("skills_required"))
    have = lower_set(profile.get("skills"))
    if required:
        matched = required & have
        breakdown["skills"] = WEIGHTS["skills"] * len(matched) / len(required)
        if matched:
            reasons.append("Uses your skills: " + ", ".join(sorted(matched)))
    else:
        breakdown["skills"] = 10
        reasons.append("No special skills needed")

    # 3. Interests
    if event.get("category", "").lower() in lower_set(profile.get("interests")):
        breakdown["interests"] = WEIGHTS["interests"]
        reasons.append(f"You're interested in {event['category']}")
    else:
        breakdown["interests"] = 0

    # 4. Availability
    if event.get("time_slot") in (profile.get("availability") or []):
        breakdown["availability"] = WEIGHTS["availability"]
        reasons.append(f"Fits your availability ({event['time_slot']})")
    else:
        breakdown["availability"] = 0

    # 5. Previous activities
    if event.get("category", "").lower() in past_categories:
        breakdown["history"] = WEIGHTS["history"]
        reasons.append(f"You've done {event['category']} activities before")
    elif event.get("organization_id") in past_org_ids:
        breakdown["history"] = 5
        reasons.append("You've volunteered with this organization")
    else:
        breakdown["history"] = 0

    breakdown = {key: round(value, 1) for key, value in breakdown.items()}
    return {
        "score": round(sum(breakdown.values())),
        "breakdown": breakdown,
        "reasons": reasons,
        "distance_km": distance,
    }
