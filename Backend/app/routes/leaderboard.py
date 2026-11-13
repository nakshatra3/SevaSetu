"""Contribution scores come only from event-owner confirmations, never client points."""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pymongo.errors import DuplicateKeyError

from app.auth import get_current_user, require_role

router = APIRouter(tags=["Leaderboard"])


def score(hours):
    return int((Decimal(str(hours)) * 10).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def badge(points):
    return "Community Hero" if points >= 200 else "Changemaker" if points >= 50 else "Helping Hand"


@router.put("/contributions/{event_id}/{volunteer_id}")
async def confirm_contribution(event_id: str, volunteer_id: str, request: Request,
                               user: dict = Depends(require_role("organization"))):
    db = request.app.state.database
    if not ObjectId.is_valid(event_id) or not ObjectId.is_valid(volunteer_id):
        raise HTTPException(422, "Enter valid event and volunteer IDs.")
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(404, "Event not found.")
    if event["organization_id"] != user["_id"]:
        raise HTTPException(403, "Only the event owner can confirm contributions.")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if event.get("status", "active") != "active" or event["end_time"] > now:
        raise HTTPException(400, "Confirm contributions only after an active event has ended.")
    volunteer = await db.users.find_one({"_id": ObjectId(volunteer_id), "role": "volunteer", "is_active": True})
    if not volunteer:
        raise HTTPException(404, "Active volunteer not found.")
    # The current app has no attendance system. The event owner attests participation.
    hours = round((event["end_time"] - event["start_time"]).total_seconds() / 3600, 2)
    if not 0 < hours <= 12:
        raise HTTPException(400, "Event duration must be between zero and 12 hours.")
    contribution = {"event_id": event["_id"], "volunteer_id": volunteer["_id"],
                    "hours": hours, "points": score(hours), "confirmed_by": user["_id"], "created_at": now}
    # Deterministic primary key makes retries/concurrent confirmations idempotent.
    key = f"{event_id.lower()}:{volunteer_id.lower()}"
    try:
        result = await db.contributions.update_one({"_id": key}, {"$setOnInsert": contribution}, upsert=True)
        created = result.upserted_id is not None
    except DuplicateKeyError:
        created = False
    return {"message": "Contribution confirmed." if created else "Already confirmed; no extra points.", "created": created}


@router.get("/leaderboard")
async def leaderboard(request: Request, limit: int = Query(50, ge=1, le=100),
                      user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$volunteer_id", "points": {"$sum": "$points"},
                     "hours": {"$sum": "$hours"}, "completed_events": {"$sum": 1}}},
        {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "volunteer"}},
        {"$unwind": "$volunteer"},
        {"$match": {"volunteer.is_active": True, "volunteer.role": "volunteer"}},
        {"$sort": {"points": -1, "hours": -1, "_id": 1}},
        {"$limit": limit},
        {"$project": {"name": "$volunteer.name", "points": 1, "hours": 1, "completed_events": 1}},
    ]
    cursor = await request.app.state.database.contributions.aggregate(pipeline)
    rows = await cursor.to_list(length=limit)
    return [{"rank": i, "volunteer_id": str(row["_id"]), "name": row["name"],
             "points": row["points"], "hours": round(row["hours"], 2),
             "completed_events": row["completed_events"], "badge": badge(row["points"])}
            for i, row in enumerate(rows, 1)]
