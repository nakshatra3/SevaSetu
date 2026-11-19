from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_db
from app.utils.helpers import clean_doc, not_found, to_object_id
from app.utils.notify import create_event_reminders

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def notification_to_dict(doc: dict) -> dict:
    data = clean_doc(doc)
    data.pop("dedupe_key", None)
    data.pop("user_id", None)
    return data


@router.get("")
def list_notifications(user: dict = Depends(get_current_user)):
    db = get_db()
    create_event_reminders(db, user["_id"])  # adds "starts within 24 hours" reminders
    docs = db.notifications.find({"user_id": user["_id"]}).sort("created_at", -1).limit(100)
    return [notification_to_dict(d) for d in docs]


@router.get("/unread-count")
def unread_count(user: dict = Depends(get_current_user)):
    db = get_db()
    create_event_reminders(db, user["_id"])
    return {"count": db.notifications.count_documents({"user_id": user["_id"], "read": False})}


@router.post("/read-all")
def mark_all_read(user: dict = Depends(get_current_user)):
    get_db().notifications.update_many({"user_id": user["_id"], "read": False}, {"$set": {"read": True}})
    return {"count": 0}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    query = {"_id": to_object_id(notification_id, "Notification"), "user_id": user["_id"]}
    if db.notifications.update_one(query, {"$set": {"read": True}}).matched_count == 0:
        raise not_found("Notification")
    return notification_to_dict(db.notifications.find_one(query))
