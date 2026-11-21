import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from app.auth import require_role
from app.database import get_db
from app.routes.events import check_event_owner, get_event_or_404
from app.schemas import CheckInRequest, VerifyAttendanceRequest
from app.utils.gamification import (
    REFERRAL_POINTS,
    award_points,
    calculate_attendance_points,
    check_and_award_badges,
    get_volunteer_stats,
)
from app.utils.helpers import bad_request, conflict, now, to_object_id
from app.utils.notify import create_notification

router = APIRouter(prefix="/attendance", tags=["Attendance"])

CHECKIN_OPENS_BEFORE = timedelta(hours=1)
CHECKIN_CLOSES_AFTER = timedelta(hours=2)


def record_attendance(db, event, volunteer_id, hours, method, verified_by, feedback=""):
    """Save verified attendance once, then award points and badges."""
    if event.get("status") == "cancelled":
        raise bad_request("This event was cancelled.")

    registration = db.registrations.find_one({"event_id": event["_id"], "volunteer_id": volunteer_id})
    if registration is None or registration["status"] == "cancelled":
        raise bad_request("This volunteer is not registered for the event.")
    if registration["status"] == "attended":
        raise conflict("Attendance is already recorded for this volunteer.")

    # Never more hours than the event itself lasted.
    hours = round(min(hours, event["duration_hours"]), 2)

    try:
        result = db.attendance.insert_one(
            {
                "event_id": event["_id"],
                "volunteer_id": volunteer_id,
                "organization_id": event["organization_id"],
                "category": event["category"],
                "hours": hours,
                "method": method,  # "qr" or "organizer"
                "verified_by": verified_by,
                "feedback": feedback.strip(),
                "checked_in_at": now(),
            }
        )
    except DuplicateKeyError:  # unique index (event_id, volunteer_id)
        raise conflict("Attendance is already recorded for this volunteer.")

    db.registrations.update_one({"_id": registration["_id"]}, {"$set": {"status": "attended"}})

    # Points: 10 per verified hour, given once per attendance record.
    points = calculate_attendance_points(hours)
    award_points(
        db, volunteer_id, points, "attendance",
        f'{hours} verified hours at "{event["title"]}"',
        source_key=f"attendance:{result.inserted_id}",
        organization_id=event["organization_id"],
    )
    create_notification(
        db, volunteer_id, "attendance", "Attendance verified",
        f'Your {hours} hours at "{event["title"]}" were added to your profile.',
        link="/app/volunteer/profile",
    )
    check_and_award_badges(db, volunteer_id)
    reward_referrer(db, volunteer_id)

    return {"hours": hours, "points": points, "method": method}


def reward_referrer(db, volunteer_id):
    """Recruitment points: only after the recruited volunteer's FIRST verified activity."""
    volunteer = db.users.find_one({"_id": volunteer_id})
    referrer_id = volunteer.get("referred_by") if volunteer else None
    if not referrer_id or get_volunteer_stats(db, volunteer_id)["events_attended"] != 1:
        return
    awarded = award_points(
        db, referrer_id, REFERRAL_POINTS, "referral",
        f'{volunteer["name"]}, who you invited, completed their first activity',
        source_key=f"referral:{volunteer_id}",
    )
    if awarded:
        check_and_award_badges(db, referrer_id)


@router.get("/events/{event_id}/code")
def get_checkin_code(event_id: str, user: dict = Depends(require_role("organization", "admin"))):
    """Only the event's organizer sees the secret code (shown as a QR code)."""
    db = get_db()
    event = get_event_or_404(db, event_id)
    check_event_owner(db, event, user)
    return {
        "event_id": str(event["_id"]),
        "code": event["checkin_code"],
        "opens_at": event["start_time"] - CHECKIN_OPENS_BEFORE,
        "closes_at": event["end_time"] + CHECKIN_CLOSES_AFTER,
    }


@router.post("/checkin")
def qr_checkin(data: CheckInRequest, user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    event = get_event_or_404(db, data.event_id)

    if not secrets.compare_digest(data.code.strip().upper(), event["checkin_code"]):
        raise bad_request("This check-in code is not valid for the event.")

    current = now()
    if current < event["start_time"] - CHECKIN_OPENS_BEFORE or current > event["end_time"] + CHECKIN_CLOSES_AFTER:
        raise bad_request("Check-in is open from 1 hour before the event until 2 hours after it ends.")

    result = record_attendance(
        db, event, user["_id"], event["duration_hours"], method="qr", verified_by=user["_id"]
    )
    return {**result, "event_id": str(event["_id"]), "event_title": event["title"]}


@router.post("/events/{event_id}/verify")
def organizer_verify(
    event_id: str,
    data: VerifyAttendanceRequest,
    user: dict = Depends(require_role("organization", "admin")),
):
    """Organizer marks a registered volunteer as present (optionally with fewer hours)."""
    db = get_db()
    event = get_event_or_404(db, event_id)
    check_event_owner(db, event, user)

    if now() < event["start_time"] - CHECKIN_OPENS_BEFORE:
        raise bad_request("You can only confirm attendance once the event has started.")

    volunteer_id = to_object_id(data.volunteer_id, "Volunteer")
    hours = data.hours if data.hours is not None else event["duration_hours"]
    result = record_attendance(
        db, event, volunteer_id, hours, method="organizer", verified_by=user["_id"], feedback=data.feedback
    )
    return {**result, "volunteer_id": data.volunteer_id}
