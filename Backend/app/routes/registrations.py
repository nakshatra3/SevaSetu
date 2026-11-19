"""Feature 5: Event registration (join, cancel, upcoming and previous activities),
plus the participant list organizers use (Feature 6)."""

from fastapi import APIRouter, Depends, Query
from pymongo.errors import DuplicateKeyError

from app.auth import require_role
from app.database import get_db
from app.routes.events import check_event_owner, get_event_or_404
from app.utils.helpers import bad_request, conflict, now
from app.utils.notify import create_notification
from app.utils.serializers import event_status, event_to_dict, organizations_by_id

router = APIRouter(tags=["Registrations"])


@router.post("/events/{event_id}/register")
def register_for_event(event_id: str, user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    event = get_event_or_404(db, event_id)

    if event_status(event) != "upcoming":
        raise bad_request("Registration is closed for this event.")

    existing = db.registrations.find_one({"event_id": event["_id"], "volunteer_id": user["_id"]})
    if existing and existing["status"] in ("registered", "attended"):
        raise conflict("You are already registered for this event.")

    # Reserve a spot. The filter only matches while registered_count < capacity,
    # and MongoDB does the check and the +1 in one step, so the event can't be overbooked.
    reserved = db.events.update_one(
        {"_id": event["_id"], "status": "active", "registered_count": {"$lt": event["capacity"]}},
        {"$inc": {"registered_count": 1}},
    )
    if reserved.modified_count == 0:
        raise bad_request("Sorry, this event is full.")

    try:
        if existing:  # they cancelled earlier and are joining again
            db.registrations.update_one(
                {"_id": existing["_id"]},
                {"$set": {"status": "registered", "registered_at": now(), "cancelled_at": None}},
            )
        else:
            db.registrations.insert_one(
                {
                    "event_id": event["_id"],
                    "volunteer_id": user["_id"],
                    "status": "registered",
                    "registered_at": now(),
                    "cancelled_at": None,
                }
            )
    except DuplicateKeyError:
        # Two clicks at the same moment: give the spot back.
        db.events.update_one({"_id": event["_id"]}, {"$inc": {"registered_count": -1}})
        raise conflict("You are already registered for this event.")

    create_notification(
        db, user["_id"], "registration", "Registration confirmed",
        f'You are registered for "{event["title"]}" on {event["start_time"]:%d %b at %I:%M %p}.',
        link=f"/app/opportunities/{event['_id']}",
    )
    org = db.organizations.find_one({"_id": event["organization_id"]})
    if org:
        create_notification(
            db, org["user_id"], "registration", "New volunteer registered",
            f'{user["name"]} joined "{event["title"]}".',
            link=f"/app/organization/events/{event['_id']}/manage",
        )

    updated = db.events.find_one({"_id": event["_id"]})
    return {"status": "registered", "event": event_to_dict(updated, org)}


@router.post("/events/{event_id}/cancel-registration")
def cancel_registration(event_id: str, user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    event = get_event_or_404(db, event_id)

    if event["start_time"] <= now():
        raise bad_request("This event has already started, so the registration can't be cancelled.")

    changed = db.registrations.update_one(
        {"event_id": event["_id"], "volunteer_id": user["_id"], "status": "registered"},
        {"$set": {"status": "cancelled", "cancelled_at": now()}},
    )
    if changed.modified_count == 0:
        raise bad_request("You are not registered for this event.")

    # Free the spot for someone else.
    db.events.update_one(
        {"_id": event["_id"], "registered_count": {"$gt": 0}},
        {"$inc": {"registered_count": -1}},
    )
    create_notification(
        db, user["_id"], "registration", "Registration cancelled",
        f'You cancelled your registration for "{event["title"]}".',
        link=f"/app/opportunities/{event['_id']}",
    )
    org = db.organizations.find_one({"_id": event["organization_id"]})
    updated = db.events.find_one({"_id": event["_id"]})
    return {"status": "cancelled", "event": event_to_dict(updated, org)}


@router.get("/registrations/me")
def my_registrations(
    scope: str = Query(default="all", pattern="^(upcoming|past|all)$"),
    user: dict = Depends(require_role("volunteer")),
):
    """upcoming = still registered and the event hasn't ended; past = everything else."""
    db = get_db()
    registrations = list(db.registrations.find({"volunteer_id": user["_id"]}))
    events = {e["_id"]: e for e in db.events.find({"_id": {"$in": [r["event_id"] for r in registrations]}})}
    orgs = organizations_by_id(db, list(events.values()))
    attended = {a["event_id"]: a for a in db.attendance.find({"volunteer_id": user["_id"]})}

    results = []
    for registration in registrations:
        event = events.get(registration["event_id"])
        if event is None:
            continue
        is_upcoming = (
            registration["status"] == "registered"
            and event.get("status") != "cancelled"
            and event["end_time"] >= now()
        )
        if (scope == "upcoming" and not is_upcoming) or (scope == "past" and is_upcoming):
            continue
        record = attended.get(event["_id"])
        results.append(
            {
                "id": str(registration["_id"]),
                "status": registration["status"],
                "registered_at": registration["registered_at"],
                "hours": record["hours"] if record else None,
                "event": event_to_dict(event, orgs.get(event["organization_id"])),
            }
        )

    # Upcoming: soonest first. Past: most recent first.
    results.sort(key=lambda r: r["event"]["start_time"], reverse=(scope != "upcoming"))
    return results


@router.get("/events/{event_id}/participants")
def event_participants(event_id: str, user: dict = Depends(require_role("organization", "admin"))):
    db = get_db()
    event = get_event_or_404(db, event_id)
    check_event_owner(db, event, user)

    registrations = list(db.registrations.find({"event_id": event["_id"]}).sort("registered_at", 1))
    volunteer_ids = [r["volunteer_id"] for r in registrations]
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": volunteer_ids}})}
    profiles = {p["user_id"]: p for p in db.volunteer_profiles.find({"user_id": {"$in": volunteer_ids}})}
    attendance = {a["volunteer_id"]: a for a in db.attendance.find({"event_id": event["_id"]})}

    participants = []
    for registration in registrations:
        volunteer = users.get(registration["volunteer_id"], {})
        record = attendance.get(registration["volunteer_id"])
        participants.append(
            {
                "registration_id": str(registration["_id"]),
                "volunteer_id": str(registration["volunteer_id"]),
                "name": volunteer.get("name", "Unknown"),
                "email": volunteer.get("email", ""),
                "phone": profiles.get(registration["volunteer_id"], {}).get("phone", ""),
                "status": registration["status"],
                "registered_at": registration["registered_at"],
                "attended": record is not None,
                "hours": record["hours"] if record else None,
                "check_in_method": record["method"] if record else None,
            }
        )
    return {"event": event_to_dict(event, db.organizations.find_one({"_id": event["organization_id"]})), "participants": participants}
