"""Feature 14: Ratings and reviews.

Only volunteers with VERIFIED attendance can review:
  * an event they attended, or
  * an organization whose event they attended.
Each volunteer can review each event once and each organization once.
"""

from typing import Optional

from fastapi import APIRouter, Depends, status
from pymongo.errors import DuplicateKeyError

from app.auth import require_role
from app.database import get_db
from app.schemas import ReviewCreate
from app.utils.helpers import bad_request, conflict, not_found, now, to_object_id
from app.utils.notify import create_notification

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def find_target(db, organization_id: Optional[str], event_id: Optional[str]):
    """Returns (organization, event). event is None for organization reviews."""
    event = None
    if event_id:
        event = db.events.find_one({"_id": to_object_id(event_id, "Event")})
        if event is None:
            raise not_found("Event")
        org = db.organizations.find_one({"_id": event["organization_id"]})
    else:
        org = db.organizations.find_one({"_id": to_object_id(organization_id, "Organization")})
    if org is None:
        raise not_found("Organization")
    return org, event


def check_eligibility(db, user, org, event) -> str:
    """Returns "" if the user may review, otherwise the reason they can't."""
    if user["role"] != "volunteer":
        return "Only volunteers can write reviews."

    if event:
        attended = db.attendance.find_one({"event_id": event["_id"], "volunteer_id": user["_id"]})
        if not attended:
            return "Only volunteers with verified attendance at this event can review it."
    else:
        attended = db.attendance.find_one({"organization_id": org["_id"], "volunteer_id": user["_id"]})
        if not attended:
            return "Volunteer at one of this organization's events to review it."

    already = db.reviews.find_one(
        {"reviewer_id": user["_id"], "organization_id": org["_id"], "event_id": event["_id"] if event else None}
    )
    if already:
        return "You have already reviewed this."
    return ""


@router.get("")
def list_reviews(organization_id: str = "", event_id: str = ""):
    db = get_db()
    query = {}
    if event_id:
        query["event_id"] = to_object_id(event_id, "Event")
    elif organization_id:
        query["organization_id"] = to_object_id(organization_id, "Organization")
    else:
        raise bad_request("Pass organization_id or event_id.")

    reviews = list(db.reviews.find(query).sort("created_at", -1).limit(100))
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": [r["reviewer_id"] for r in reviews]}})}
    events = {e["_id"]: e for e in db.events.find({"_id": {"$in": [r["event_id"] for r in reviews if r["event_id"]]}})}

    return [
        {
            "id": str(r["_id"]),
            "rating": r["rating"],
            "comment": r["comment"],
            "reviewer_id": str(r["reviewer_id"]),
            "reviewer_name": users.get(r["reviewer_id"], {}).get("name", "Volunteer"),
            "organization_id": str(r["organization_id"]),
            "event_id": str(r["event_id"]) if r["event_id"] else None,
            "event_title": events.get(r["event_id"], {}).get("title") if r["event_id"] else None,
            "created_at": r["created_at"],
        }
        for r in reviews
    ]


@router.get("/eligibility")
def review_eligibility(
    organization_id: str = "", event_id: str = "", user: dict = Depends(require_role("volunteer"))
):
    db = get_db()
    org, event = find_target(db, organization_id or None, event_id or None)
    reason = check_eligibility(db, user, org, event)
    return {"can_review": reason == "", "reason": reason}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_review(data: ReviewCreate, user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    org, event = find_target(db, data.organization_id, data.event_id)

    reason = check_eligibility(db, user, org, event)
    if reason:
        raise bad_request(reason)

    review = {
        "reviewer_id": user["_id"],
        "organization_id": org["_id"],
        "event_id": event["_id"] if event else None,
        "rating": data.rating,
        "comment": data.comment.strip(),
        "created_at": now(),
    }
    try:
        review["_id"] = db.reviews.insert_one(review).inserted_id
    except DuplicateKeyError:
        raise conflict("You have already reviewed this.")

    create_notification(
        db, org["user_id"], "review", "New review",
        f'{user["name"]} gave {data.rating}/5' + (f' for "{event["title"]}".' if event else "."),
        link=f"/app/organizations/{org['_id']}",
    )
    return {"id": str(review["_id"]), "rating": review["rating"], "comment": review["comment"]}
