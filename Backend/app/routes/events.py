from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.auth import require_role, get_optional_user
from app.schemas import EventCreate

router = APIRouter(prefix="/events", tags=["Events"])


def _event_response(event: dict, organization_name: str = "") -> dict:
    capacity = event["capacity"]
    registered_count = event.get("registered_count", 0)
    return {
        "id": str(event["_id"]),
        "organization_id": str(event["organization_id"]),
        "organization_name": organization_name,
        "title": event["title"],
        "description": event["description"],
        "category": event["category"],
        "city": event["city"],
        "address": event.get("address", ""),
        "latitude": event["latitude"],
        "longitude": event["longitude"],
        "start_time": event["start_time"],
        "end_time": event["end_time"],
        "duration_hours": event["duration_hours"],
        "capacity": capacity,
        "registered_count": registered_count,
        "spots_left": max(capacity - registered_count, 0),
        "skills_required": event.get("skills_required", []),
        "status": event.get("status", "active"),
        "created_at": event.get("created_at"),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    request: Request,
    user: dict = Depends(require_role("organization")),
):
    """Create an event for the logged-in organization account."""
    db = request.app.state.database
    now = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)

    if data.start_time <= now:
        raise HTTPException(status_code=400, detail="The event must start in the future.")

    event = {
        "organization_id": user["_id"],
        "organization_name": user.get("organization_name") or user["name"],
        "created_by": user["_id"],
        "title": data.title.strip(),
        "description": data.description.strip(),
        "category": data.category.strip(),
        "city": data.city.strip(),
        "address": data.address.strip(),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "duration_hours": round((data.end_time - data.start_time).total_seconds() / 3600, 2),
        "capacity": data.capacity,
        "registered_count": 0,
        "skills_required": data.skills_required,
        "status": "active",
        "created_at": now,
    }
    result = await db.events.insert_one(event)
    event["_id"] = result.inserted_id
    return _event_response(event, event["organization_name"])


@router.get("")
async def list_events(
    request: Request,
    q: str = "",
    category: str = "",
    city: str = "",
    include_past: bool = False,
    limit: int = Query(default=100, ge=1, le=200),
):
    """List active events, with optional title/description/category/city filters."""
    db = request.app.state.database
    query = {"status": "active"}
    if not include_past:
        query["end_time"] = {"$gte": datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)}
    if category.strip():
        query["category"] = {"$regex": category.strip(), "$options": "i"}
    if city.strip():
        query["city"] = {"$regex": city.strip(), "$options": "i"}
    if q.strip():
        query["$or"] = [
            {"title": {"$regex": q.strip(), "$options": "i"}},
            {"description": {"$regex": q.strip(), "$options": "i"}},
        ]

    cursor = db.events.find(query).sort("start_time", 1).limit(limit)
    events = await cursor.to_list(length=limit)
    return [
        _event_response(event, event.get("organization_name", ""))
        for event in events
    ]


@router.get("/{event_id}")
async def get_event(event_id: str, request: Request):
    """Return one event by its MongoDB ID."""
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=404, detail="Event not found.")
    event = await request.app.state.database.events.find_one({"_id": ObjectId(event_id)})
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return _event_response(event, event.get("organization_name", ""))
