"""Feature 16: Reporting users, organizations or events (admins review them)."""

from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.database import get_db
from app.schemas import ReportCreate
from app.utils.helpers import bad_request, not_found, now, to_object_id
from app.utils.notify import notify_many

router = APIRouter(prefix="/reports", tags=["Reports"])


def target_label(db, target_type: str, target_id) -> str:
    """Name of the reported thing, or None if it doesn't exist."""
    if target_type == "user":
        doc = db.users.find_one({"_id": target_id})
        return doc["name"] if doc else None
    if target_type == "organization":
        doc = db.organizations.find_one({"_id": target_id})
        return doc["name"] if doc else None
    doc = db.events.find_one({"_id": target_id})
    return doc["title"] if doc else None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_report(data: ReportCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    target_id = to_object_id(data.target_id, data.target_type.capitalize())
    label = target_label(db, data.target_type, target_id)
    if label is None:
        raise not_found(data.target_type.capitalize())
    if data.target_type == "user" and target_id == user["_id"]:
        raise bad_request("You can't report yourself.")

    report = {
        "reporter_id": user["_id"],
        "target_type": data.target_type,
        "target_id": target_id,
        "target_label": label,
        "reason": data.reason,
        "details": data.details.strip(),
        "status": "open",
        "resolution_note": "",
        "created_at": now(),
    }
    report["_id"] = db.reports.insert_one(report).inserted_id

    admin_ids = [a["_id"] for a in db.users.find({"role": "admin", "is_active": True})]
    notify_many(
        db, admin_ids, "report", "New report",
        f"A {data.target_type} ({label}) was reported for {data.reason}.", link="/app/admin/reports",
    )
    return {"id": str(report["_id"]), "status": "open"}
