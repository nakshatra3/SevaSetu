"""Feature 10: Leaderboards (global, city, college, monthly, organization-wise).

All rankings are built from the real `points_ledger` records:
  global       -> all points
  monthly      -> points earned since the 1st of this month
  organization -> points earned through one organization's events/donations
  city/college -> all points, only volunteers whose profile has that city/college
"""

import re

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.database import get_db
from app.utils.helpers import bad_request, now, to_object_id

router = APIRouter(prefix="/leaderboards", tags=["Leaderboards"])


def same_text(value: str) -> dict:
    """Case-insensitive exact match."""
    return {"$regex": "^" + re.escape(value.strip()) + "$", "$options": "i"}


@router.get("")
def get_leaderboard(
    scope: str = Query(default="global", pattern="^(global|city|college|monthly|organization)$"),
    value: str = "",
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_user),
):
    db = get_db()
    match = {}
    my_profile = db.volunteer_profiles.find_one({"user_id": user["_id"]}) or {}

    if scope == "monthly":
        match["created_at"] = {"$gte": now().replace(day=1, hour=0, minute=0, second=0)}
    elif scope == "organization":
        if not value and user["role"] == "organization":
            own = db.organizations.find_one({"user_id": user["_id"]})
            value = str(own["_id"]) if own else ""
        if not value:
            raise bad_request("Choose an organization.")
        match["organization_id"] = to_object_id(value, "Organization")
    elif scope in ("city", "college"):
        value = value or my_profile.get(scope, "")
        if not value:
            raise bad_request(f"Choose a {scope} (or add one to your profile).")
        profiles = db.volunteer_profiles.find({scope: same_text(value)}, {"user_id": 1})
        match["user_id"] = {"$in": [p["user_id"] for p in profiles]}

    # Add up points per volunteer, highest first.
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$user_id", "points": {"$sum": "$points"}}},
        {"$sort": {"points": -1}},
    ]
    totals = [row for row in db.points_ledger.aggregate(pipeline) if row["points"] > 0]

    user_ids = [row["_id"] for row in totals]
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": user_ids}, "is_active": True})}
    profiles = {p["user_id"]: p for p in db.volunteer_profiles.find({"user_id": {"$in": user_ids}})}
    hours = {}
    for record in db.attendance.find({"volunteer_id": {"$in": user_ids}}, {"volunteer_id": 1, "hours": 1}):
        hours[record["volunteer_id"]] = hours.get(record["volunteer_id"], 0) + record["hours"]

    entries = []
    for row in totals:
        if row["_id"] not in users:  # skip deactivated accounts
            continue
        profile = profiles.get(row["_id"], {})
        entries.append(
            {
                "rank": len(entries) + 1,
                "user_id": str(row["_id"]),
                "name": users[row["_id"]]["name"],
                "city": profile.get("city", ""),
                "college": profile.get("college", ""),
                "points": row["points"],
                "hours": round(hours.get(row["_id"], 0), 1),
            }
        )

    my_rank = next((e["rank"] for e in entries if e["user_id"] == str(user["_id"])), None)
    return {"scope": scope, "value": value, "my_rank": my_rank, "entries": entries[:limit]}


@router.get("/options")
def leaderboard_options(user: dict = Depends(get_current_user)):
    """Values for the city / college / organization dropdowns."""
    db = get_db()
    cities = sorted({c.strip() for c in db.volunteer_profiles.distinct("city") if c and c.strip()})
    colleges = sorted({c.strip() for c in db.volunteer_profiles.distinct("college") if c and c.strip()})
    organizations = [
        {"id": str(o["_id"]), "name": o["name"]}
        for o in db.organizations.find({}, {"name": 1}).sort("name", 1)
    ]
    my_profile = db.volunteer_profiles.find_one({"user_id": user["_id"]}) or {}
    return {
        "cities": cities,
        "colleges": colleges,
        "organizations": organizations,
        "my_city": my_profile.get("city", ""),
        "my_college": my_profile.get("college", ""),
    }
