"""Features 9 and 11: points history and badges (admins manage badge definitions)."""

import re

from fastapi import APIRouter, Depends, status
from pymongo.errors import DuplicateKeyError

from app.auth import get_current_user, require_role
from app.database import get_db
from app.schemas import BadgeCreate
from app.utils.gamification import (
    POINTS_PER_HOUR,
    REFERRAL_POINTS,
    badge_progress,
    check_and_award_badges,
    get_volunteer_stats,
)
from app.utils.helpers import clean_doc, conflict, not_found, now, to_object_id

router = APIRouter(tags=["Points and badges"])


@router.get("/badges")
def list_badges(user: dict = Depends(get_current_user)):
    """All badges. For volunteers each badge also shows progress and whether it's earned."""
    db = get_db()
    earned = {}
    stats = None
    if user["role"] == "volunteer":
        earned = {b["badge_id"]: b["earned_at"] for b in db.user_badges.find({"user_id": user["_id"]})}
        stats = get_volunteer_stats(db, user["_id"])

    result = []
    for badge in db.badges.find().sort("threshold", 1):
        item = clean_doc(badge)
        item["earned"] = badge["_id"] in earned
        item["earned_at"] = earned.get(badge["_id"])
        item["progress"] = badge_progress(badge, stats) if stats else None
        item["holders"] = db.user_badges.count_documents({"badge_id": badge["_id"]})
        result.append(item)
    return result


@router.get("/points/me")
def my_points(user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    stats = get_volunteer_stats(db, user["_id"])
    history = db.points_ledger.find({"user_id": user["_id"]}).sort("created_at", -1).limit(100)
    return {
        "total_points": stats["points"],
        "total_hours": stats["total_hours"],
        "rules": {
            "points_per_hour": POINTS_PER_HOUR,
            "referral_points": REFERRAL_POINTS,
            "money_donation": "1 point per Rs 100 (max 50)",
            "item_donation": "2 points per item (max 30)",
        },
        "history": [
            {
                "id": str(entry["_id"]),
                "points": entry["points"],
                "kind": entry["kind"],
                "description": entry["description"],
                "created_at": entry["created_at"],
            }
            for entry in history
        ],
    }


# ---------- Admin: manage badges (Feature 17) ----------

def badge_code(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@router.post("/badges", status_code=status.HTTP_201_CREATED)
def create_badge(data: BadgeCreate, user: dict = Depends(require_role("admin"))):
    db = get_db()
    badge = {**data.model_dump(), "code": badge_code(data.name), "created_at": now()}
    try:
        badge["_id"] = db.badges.insert_one(badge).inserted_id
    except DuplicateKeyError:
        raise conflict("A badge with this name already exists.")

    # Give the new badge to everyone who already qualifies.
    for volunteer in db.users.find({"role": "volunteer"}, {"_id": 1}):
        check_and_award_badges(db, volunteer["_id"])
    return clean_doc(badge)


@router.put("/badges/{badge_id}")
def update_badge(badge_id: str, data: BadgeCreate, user: dict = Depends(require_role("admin"))):
    db = get_db()
    oid = to_object_id(badge_id, "Badge")
    if db.badges.update_one({"_id": oid}, {"$set": data.model_dump()}).matched_count == 0:
        raise not_found("Badge")
    return clean_doc(db.badges.find_one({"_id": oid}))


@router.delete("/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_badge(badge_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    oid = to_object_id(badge_id, "Badge")
    if db.badges.delete_one({"_id": oid}).deleted_count == 0:
        raise not_found("Badge")
    db.user_badges.delete_many({"badge_id": oid})
