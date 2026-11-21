import re
import secrets
import string
from datetime import date, datetime, time
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.auth import get_optional_user, require_role
from app.database import get_db
from app.routes.organizations import get_my_organization_doc
from app.schemas import EventCreate
from app.utils.geo import distance_km, has_location, time_slot_for
from app.utils.helpers import bad_request, contains_text, forbidden, not_found, now, to_object_id
from app.utils.notify import create_notification, notify_many
from app.utils.serializers import event_status, event_to_dict, events_to_list

router = APIRouter(prefix="/events", tags=["Events"])

NEARBY_NOTIFY_KM = 25  # volunteers within this distance hear about new events


def new_checkin_code() -> str:
    """Short secret code shown as a QR code by the organizer at the event."""
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def get_event_or_404(db, event_id: str) -> dict:
    event = db.events.find_one({"_id": to_object_id(event_id, "Event")})
    if event is None:
        raise not_found("Event")
    return event


def check_event_owner(db, event: dict, user: dict):
    """Organizers may only manage their own events. Admins may manage all."""
    if user["role"] == "admin":
        return
    org = get_my_organization_doc(db, user) if user["role"] == "organization" else None
    if org is None or event["organization_id"] != org["_id"]:
        raise forbidden("You can only manage your own events.")


def check_category(db, category: str) -> str:
    pattern = "^" + re.escape(category.strip()) + "$"
    found = db.categories.find_one({"name": {"$regex": pattern, "$options": "i"}})
    if found is None:
        raise bad_request("Choose one of the listed categories.")
    return found["name"]


def event_fields(data: EventCreate, category: str) -> dict:
    """Values saved for a new or edited event (duration and time slot are calculated)."""
    return {
        "title": data.title.strip(),
        "description": data.description.strip(),
        "category": category,
        "city": data.city.strip(),
        "address": data.address.strip(),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "duration_hours": round((data.end_time - data.start_time).total_seconds() / 3600, 2),
        "time_slot": time_slot_for(data.start_time),
        "capacity": data.capacity,
        "skills_required": data.skills_required,
    }


def registered_volunteer_ids(db, event_id) -> list:
    return [
        r["volunteer_id"]
        for r in db.registrations.find({"event_id": event_id, "status": "registered"})
    ]


def notify_nearby_volunteers(db, event: dict):
    """Tell volunteers in the same city (or within 25 km) about a new event."""
    city = event["city"].strip().lower()
    for profile in db.volunteer_profiles.find().limit(1000):
        close_by = has_location(profile) and distance_km(
            profile["latitude"], profile["longitude"], event["latitude"], event["longitude"]
        ) <= NEARBY_NOTIFY_KM
        same_city = profile.get("city", "").strip().lower() == city
        if close_by or same_city:
            create_notification(
                db,
                profile["user_id"],
                "nearby",
                "New opportunity near you",
                f'{event["title"]} in {event["city"]} on {event["start_time"]:%d %b}.',
                link=f"/app/opportunities/{event['_id']}",
            )


# ---------- Search (Features 3 and 4) ----------

@router.get("")
def search_events(
    q: str = "",
    category: str = "",
    city: str = "",
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_hours: Optional[float] = Query(default=None, ge=0),
    max_hours: Optional[float] = Query(default=None, ge=0),
    skills: str = "",  # comma separated
    time_slot: str = "",  # availability, e.g. "Weekends"
    has_spots: bool = False,
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lng: Optional[float] = Query(default=None, ge=-180, le=180),
    radius_km: Optional[float] = Query(default=None, gt=0, le=500),
    include_past: bool = False,
    organization_id: str = "",
    sort: str = "date",  # "date" or "distance"
    limit: int = Query(default=100, ge=1, le=200),
):
    db = get_db()

    query = {"status": "active"}
    if not include_past:
        query["end_time"] = {"$gte": now()}
    if q.strip():
        text = contains_text(q)
        query["$or"] = [{"title": text}, {"description": text}, {"city": text}, {"skills_required": text}]
    if category:
        query["category"] = category
    if city.strip():
        query["city"] = contains_text(city)
    if date_from or date_to:
        query["start_time"] = {}
        if date_from:
            query["start_time"]["$gte"] = datetime.combine(date_from, time.min)
        if date_to:
            query["start_time"]["$lte"] = datetime.combine(date_to, time.max)
    if min_hours is not None or max_hours is not None:
        query["duration_hours"] = {}
        if min_hours is not None:
            query["duration_hours"]["$gte"] = min_hours
        if max_hours is not None:
            query["duration_hours"]["$lte"] = max_hours
    if time_slot:
        query["time_slot"] = time_slot
    if organization_id:
        query["organization_id"] = to_object_id(organization_id, "Organization")

    events = list(db.events.find(query).sort("start_time", 1).limit(500))

    # Step 2: filters that are easier in Python (fine for a few hundred events).
    wanted_skills = {s.strip().lower() for s in skills.split(",") if s.strip()}
    if wanted_skills:
        events = [
            e for e in events
            if wanted_skills & {s.lower() for s in e.get("skills_required", [])}
        ]
    if has_spots:
        events = [e for e in events if e.get("registered_count", 0) < e["capacity"]]

    results = events_to_list(db, events)

    if lat is not None and lng is not None:
        for item in results:
            item["distance_km"] = (
                distance_km(lat, lng, item["latitude"], item["longitude"])
                if has_location(item) else None
            )
        if radius_km:
            results = [
                r for r in results
                if r["distance_km"] is not None and r["distance_km"] <= radius_km
            ]
        if sort == "distance":
            results.sort(key=lambda r: r["distance_km"] if r["distance_km"] is not None else 99999)

    return results[:limit]


@router.get("/mine")
def my_events(user: dict = Depends(require_role("organization"))):
    db = get_db()
    org = get_my_organization_doc(db, user)
    events = list(db.events.find({"organization_id": org["_id"]}).sort("start_time", -1))
    results = events_to_list(db, events)
    for item, event in zip(results, events):
        item["attended_count"] = db.attendance.count_documents({"event_id": event["_id"]})
    return results


@router.post("", status_code=status.HTTP_201_CREATED)
def create_event(data: EventCreate, user: dict = Depends(require_role("organization"))):
    db = get_db()
    org = get_my_organization_doc(db, user)
    if data.start_time <= now():
        raise bad_request("The event must start in the future.")

    event = {
        **event_fields(data, check_category(db, data.category)),
        "organization_id": org["_id"],
        "created_by": user["_id"],
        "registered_count": 0,
        "status": "active",
        "checkin_code": new_checkin_code(),
        "created_at": now(),
    }
    event["_id"] = db.events.insert_one(event).inserted_id
    notify_nearby_volunteers(db, event)
    return event_to_dict(event, org)


@router.get("/{event_id}")
def get_event(event_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    event = get_event_or_404(db, event_id)
    org = db.organizations.find_one({"_id": event["organization_id"]})
    data = event_to_dict(event, org)
    data["organization_city"] = org.get("city", "") if org else ""

    data["my_registration_status"] = None
    data["is_owner"] = False
    if viewer and viewer["role"] == "volunteer":
        registration = db.registrations.find_one({"event_id": event["_id"], "volunteer_id": viewer["_id"]})
        data["my_registration_status"] = registration["status"] if registration else None
    if viewer and viewer["role"] == "organization" and org and org["user_id"] == viewer["_id"]:
        data["is_owner"] = True
    return data


@router.put("/{event_id}")
def update_event(event_id: str, data: EventCreate, user: dict = Depends(require_role("organization"))):
    db = get_db()
    event = get_event_or_404(db, event_id)
    check_event_owner(db, event, user)

    if event_status(event) in ("cancelled", "completed"):
        raise bad_request("Cancelled or finished events can't be edited.")
    if data.capacity < event.get("registered_count", 0):
        raise bad_request(
            f"Capacity can't be lower than the {event['registered_count']} volunteers already registered."
        )

    db.events.update_one(
        {"_id": event["_id"]},
        {"$set": {**event_fields(data, check_category(db, data.category)), "updated_at": now()}},
    )
    updated = db.events.find_one({"_id": event["_id"]})

    notify_many(
        db, registered_volunteer_ids(db, event["_id"]), "event_update", "Event updated",
        f'"{updated["title"]}" was updated. Please check the date, time and place.',
        link=f"/app/opportunities/{event['_id']}",
    )
    return event_to_dict(updated, db.organizations.find_one({"_id": updated["organization_id"]}))


@router.post("/{event_id}/cancel")
def cancel_event(event_id: str, user: dict = Depends(require_role("organization", "admin"))):
    db = get_db()
    event = get_event_or_404(db, event_id)
    check_event_owner(db, event, user)
    if event.get("status") == "cancelled":
        raise bad_request("This event is already cancelled.")

    db.events.update_one({"_id": event["_id"]}, {"$set": {"status": "cancelled", "updated_at": now()}})
    notify_many(
        db, registered_volunteer_ids(db, event["_id"]), "event_update", "Event cancelled",
        f'"{event["title"]}" on {event["start_time"]:%d %b} has been cancelled.',
        link=f"/app/opportunities/{event['_id']}",
    )
    updated = db.events.find_one({"_id": event["_id"]})
    return event_to_dict(updated, db.organizations.find_one({"_id": updated["organization_id"]}))
