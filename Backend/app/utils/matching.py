from app.utils.geo import distance_km, has_location

WEIGHTS = {"distance": 30, "skills": 25, "interests": 20, "availability": 15, "history": 10}
MAX_DISTANCE_KM = 50


def lower_set(values) -> set:
    return {str(v).strip().lower() for v in values or [] if str(v).strip()}


def score_event(event: dict, profile: dict, past_categories: set, past_org_ids: set) -> dict:
    breakdown = {}
    reasons = []

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

    if event.get("category", "").lower() in lower_set(profile.get("interests")):
        breakdown["interests"] = WEIGHTS["interests"]
        reasons.append(f"You're interested in {event['category']}")
    else:
        breakdown["interests"] = 0

    if event.get("time_slot") in (profile.get("availability") or []):
        breakdown["availability"] = WEIGHTS["availability"]
        reasons.append(f"Fits your availability ({event['time_slot']})")
    else:
        breakdown["availability"] = 0

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
