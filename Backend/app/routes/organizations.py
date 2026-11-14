from typing import Optional

from fastapi import APIRouter, Depends

from app.auth import get_optional_user, require_role
from app.database import get_db
from app.schemas import OrganizationUpdate, VerificationRequest
from app.services.auth_service import new_organization
from app.utils.helpers import bad_request, contains_text, not_found, now, to_object_id
from app.utils.notify import notify_many
from app.utils.serializers import organization_rating, organization_to_dict

router = APIRouter(prefix="/organizations", tags=["Organizations"])


def get_my_organization_doc(db, user: dict) -> dict:
    org = db.organizations.find_one({"user_id": user["_id"]})
    if org is None:
        org = new_organization(user["_id"], user.get("organization_name") or user["name"])
        db.organizations.insert_one(org)
    return org


@router.get("")
def list_organizations(q: str = "", verified_only: bool = False):
    db = get_db()
    query = {}
    if q.strip():
        query["name"] = contains_text(q)
    if verified_only:
        query["verification_status"] = "verified"

    result = []
    for org in db.organizations.find(query).sort("name", 1).limit(200):
        rating_average, rating_count = organization_rating(db, org["_id"])
        result.append(
            {
                "id": str(org["_id"]),
                "name": org["name"],
                "city": org.get("city", ""),
                "verification_status": org.get("verification_status", "unverified"),
                "rating_average": rating_average,
                "rating_count": rating_count,
            }
        )
    return result


@router.get("/me")
def get_my_organization(user: dict = Depends(require_role("organization"))):
    db = get_db()
    return organization_to_dict(db, get_my_organization_doc(db, user), private=True)


@router.put("/me")
def update_my_organization(data: OrganizationUpdate, user: dict = Depends(require_role("organization"))):
    db = get_db()
    org = get_my_organization_doc(db, user)  # ownership: you can only edit your own

    values = data.model_dump()
    values["contact_email"] = str(values["contact_email"] or "")
    db.organizations.update_one({"_id": org["_id"]}, {"$set": {**values, "updated_at": now()}})

    db.users.update_one({"_id": user["_id"]}, {"$set": {"organization_name": values["name"]}})

    return organization_to_dict(db, db.organizations.find_one({"_id": org["_id"]}), private=True)


@router.post("/me/verification-request")
def request_verification(data: VerificationRequest, user: dict = Depends(require_role("organization"))):
    db = get_db()
    org = get_my_organization_doc(db, user)
    if org.get("verification_status") not in ("unverified", "rejected"):
        raise bad_request("Verification is already pending or approved.")

    db.organizations.update_one(
        {"_id": org["_id"]},
        {
            "$set": {
                "verification_status": "pending",
                "verification_note": "",
                "verification_request": {
                    "note": data.note.strip(),
                    "registration_number": data.registration_number.strip(),
                    "submitted_at": now(),
                },
            }
        },
    )
    admin_ids = [a["_id"] for a in db.users.find({"role": "admin", "is_active": True})]
    notify_many(
        db, admin_ids, "verification", "New verification request",
        f'{org["name"]} asked to be verified.', link="/app/admin/organizations",
    )
    return organization_to_dict(db, db.organizations.find_one({"_id": org["_id"]}), private=True)


@router.get("/me/stats")
def my_organization_stats(user: dict = Depends(require_role("organization"))):
    db = get_db()
    org = get_my_organization_doc(db, user)
    events = list(db.events.find({"organization_id": org["_id"], "status": "active"}))
    upcoming = [e for e in events if e["end_time"] >= now()]
    event_ids = [e["_id"] for e in events]
    attendance = list(db.attendance.find({"organization_id": org["_id"]}))
    rating_average, rating_count = organization_rating(db, org["_id"])

    return {
        "organization_id": str(org["_id"]),
        "organization_name": org["name"],
        "verification_status": org.get("verification_status", "unverified"),
        "total_events": len(events),
        "upcoming_events": len(upcoming),
        "active_registrations": db.registrations.count_documents(
            {"event_id": {"$in": event_ids}, "status": "registered"}
        ),
        "volunteers_engaged": len({a["volunteer_id"] for a in attendance}),
        "hours_delivered": round(sum(a["hours"] for a in attendance), 1),
        "pending_donations": db.donations.count_documents(
            {"organization_id": org["_id"], "status": "pending"}
        ),
        "rating_average": rating_average,
        "rating_count": rating_count,
    }


@router.get("/{org_id}")
def get_organization(org_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    db = get_db()
    org = db.organizations.find_one({"_id": to_object_id(org_id, "Organization")})
    if org is None:
        raise not_found("Organization")
    private = bool(viewer) and (viewer["role"] == "admin" or viewer["_id"] == org["user_id"])
    return organization_to_dict(db, org, private=private)
