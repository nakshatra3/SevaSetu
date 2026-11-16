from fastapi import APIRouter, Depends, Query

from app.auth import require_role
from app.database import get_db
from app.schemas import ReportDecision, UserStatusUpdate, VerificationDecision
from app.utils.helpers import bad_request, contains_text, not_found, now, to_object_id
from app.utils.notify import create_notification
from app.utils.serializers import events_to_list, organization_to_dict, user_to_dict

router = APIRouter(prefix="/admin", tags=["Admin"])

admin_only = require_role("admin")


@router.get("/stats")
def platform_stats(admin: dict = Depends(admin_only)):
    db = get_db()
    attendance = list(db.attendance.find({}, {"hours": 1}))
    money = db.donations.find({"type": "money", "status": "verified"}, {"amount": 1})
    return {
        "total_users": db.users.count_documents({}),
        "volunteers": db.users.count_documents({"role": "volunteer"}),
        "organizations": db.users.count_documents({"role": "organization"}),
        "total_events": db.events.count_documents({}),
        "upcoming_events": db.events.count_documents({"status": "active", "start_time": {"$gte": now()}}),
        "registrations": db.registrations.count_documents({"status": {"$ne": "cancelled"}}),
        "verified_hours": round(sum(a["hours"] for a in attendance), 1),
        "attendance_records": len(attendance),
        "points_awarded": sum(p["points"] for p in db.points_ledger.find({}, {"points": 1})),
        "badges_awarded": db.user_badges.count_documents({}),
        "donations": db.donations.count_documents({}),
        "verified_money_donated": sum(d["amount"] or 0 for d in money),
        "reviews": db.reviews.count_documents({}),
        "pending_verifications": db.organizations.count_documents({"verification_status": "pending"}),
        "open_reports": db.reports.count_documents({"status": "open"}),
    }


#Users 
@router.get("/users")
def list_users(search: str = "", role: str = "", admin: dict = Depends(admin_only)):
    db = get_db()
    query = {}
    if search.strip():
        query["$or"] = [
            {"name": contains_text(search)},
            {"email": contains_text(search)},
            {"organization_name": contains_text(search)},
        ]
    if role:
        query["role"] = role
    return [user_to_dict(u) for u in db.users.find(query).sort("created_at", -1).limit(300)]


@router.patch("/users/{user_id}")
def set_user_active(user_id: str, data: UserStatusUpdate, admin: dict = Depends(admin_only)):
    db = get_db()
    oid = to_object_id(user_id, "User")
    if oid == admin["_id"]:
        raise bad_request("You can't deactivate your own account.")
    if db.users.update_one({"_id": oid}, {"$set": {"is_active": data.is_active}}).matched_count == 0:
        raise not_found("User")
    return user_to_dict(db.users.find_one({"_id": oid}))


#Organisation 
@router.get("/organizations")
def list_organizations(
    verification_status: str = Query(default="", pattern="^(|unverified|pending|verified|rejected)$"),
    admin: dict = Depends(admin_only),
):
    db = get_db()
    query = {"verification_status": verification_status} if verification_status else {}
    orgs = db.organizations.find(query).sort("created_at", -1).limit(300)
    return [organization_to_dict(db, org, private=True) for org in orgs]


@router.patch("/organizations/{org_id}/verification")
def decide_verification(org_id: str, data: VerificationDecision, admin: dict = Depends(admin_only)):
    db = get_db()
    org = db.organizations.find_one({"_id": to_object_id(org_id, "Organization")})
    if org is None:
        raise not_found("Organization")

    db.organizations.update_one(
        {"_id": org["_id"]},
        {"$set": {"verification_status": data.status, "verification_note": data.note.strip(), "verified_at": now()}},
    )
    if data.status == "verified":
        title, body = "Organization verified", "Your organization now shows a verified badge."
    else:
        title = "Verification rejected"
        body = data.note.strip() or "Please update your details and request verification again."
    create_notification(db, org["user_id"], "verification", title, body, link="/app/organization/profile")

    return organization_to_dict(db, db.organizations.find_one({"_id": org["_id"]}), private=True)


# reports
@router.get("/reports")
def list_reports(
    status: str = Query(default="", pattern="^(|open|resolved|dismissed)$"),
    admin: dict = Depends(admin_only),
):
    db = get_db()
    query = {"status": status} if status else {}
    reports = list(db.reports.find(query).sort("created_at", -1).limit(300))
    reporters = {u["_id"]: u for u in db.users.find({"_id": {"$in": [r["reporter_id"] for r in reports]}})}
    return [
        {
            "id": str(r["_id"]),
            "target_type": r["target_type"],
            "target_id": str(r["target_id"]),
            "target_label": r["target_label"],
            "reason": r["reason"],
            "details": r["details"],
            "reporter_name": reporters.get(r["reporter_id"], {}).get("name", "Unknown"),
            "status": r["status"],
            "resolution_note": r.get("resolution_note", ""),
            "created_at": r["created_at"],
        }
        for r in reports
    ]


@router.patch("/reports/{report_id}")
def decide_report(report_id: str, data: ReportDecision, admin: dict = Depends(admin_only)):
    db = get_db()
    oid = to_object_id(report_id, "Report")
    update = {"status": data.status, "resolution_note": data.resolution_note.strip(), "resolved_at": now()}
    if db.reports.update_one({"_id": oid}, {"$set": update}).matched_count == 0:
        raise not_found("Report")
    return {"id": report_id, **update}


# Events

@router.get("/events")
def list_all_events(q: str = "", status: str = "", admin: dict = Depends(admin_only)):
    db = get_db()
    query = {}
    if q.strip():
        query["title"] = contains_text(q)
    if status == "cancelled":
        query["status"] = "cancelled"
    elif status == "active":
        query["status"] = "active"
    events = list(db.events.find(query).sort("start_time", -1).limit(300))
    return events_to_list(db, events)
