"""Feature 18: Smart volunteer matching.

Scores every upcoming event that still has free spots, using the simple
weighted formula in app/utils/matching.py, and returns the best ones with
the reasons behind each score.
"""

from fastapi import APIRouter, Depends, Query

from app.auth import require_role
from app.database import get_db
from app.routes.volunteers import get_or_create_profile
from app.utils.helpers import now
from app.utils.matching import score_event
from app.utils.serializers import event_to_dict, organizations_by_id

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("")
def recommend_events(
    limit: int = Query(default=10, ge=1, le=50),
    user: dict = Depends(require_role("volunteer")),
):
    db = get_db()
    profile = get_or_create_profile(db, user["_id"])

    # What the volunteer did before (for the "history" part of the score).
    past = list(db.attendance.find({"volunteer_id": user["_id"]}))
    past_categories = {a.get("category", "").lower() for a in past}
    past_org_ids = {a["organization_id"] for a in past}

    # Skip events they already joined.
    joined = {
        r["event_id"]
        for r in db.registrations.find({"volunteer_id": user["_id"], "status": {"$ne": "cancelled"}})
    }

    candidates = [
        event
        for event in db.events.find({"status": "active", "start_time": {"$gt": now()}})
        if event["_id"] not in joined and event.get("registered_count", 0) < event["capacity"]
    ]

    orgs = organizations_by_id(db, candidates)
    results = []
    for event in candidates:
        match = score_event(event, profile, past_categories, past_org_ids)
        results.append({**event_to_dict(event, orgs.get(event["organization_id"])), "match": match})

    # Highest score first; for equal scores the sooner event first.
    results.sort(key=lambda item: (-item["match"]["score"], item["start_time"]))

    profile_complete = bool(profile.get("skills") or profile.get("interests") or profile.get("availability"))
    return {"profile_complete": profile_complete, "results": results[:limit]}
