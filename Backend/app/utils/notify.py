from datetime import timedelta

from pymongo.errors import DuplicateKeyError

from app.utils.helpers import now


def create_notification(db, user_id, type_, title, body, link="", dedupe_key=None):
    doc = {
        "user_id": user_id,
        "type": type_,
        "title": title,
        "body": body,
        "link": link,
        "read": False,
        "created_at": now(),
    }
    if dedupe_key:
        doc["dedupe_key"] = dedupe_key
    try:
        db.notifications.insert_one(doc)
    except DuplicateKeyError:
        pass  # already sent before


def notify_many(db, user_ids, type_, title, body, link=""):
    for user_id in user_ids:
        create_notification(db, user_id, type_, title, body, link)


def create_event_reminders(db, user_id):
    current = now()
    registrations = db.registrations.find({"volunteer_id": user_id, "status": "registered"})
    for registration in registrations:
        event = db.events.find_one(
            {
                "_id": registration["event_id"],
                "status": "active",
                "start_time": {"$gte": current, "$lte": current + timedelta(hours=24)},
            }
        )
        if event:
            create_notification(
                db,
                user_id,
                "reminder",
                "Event reminder",
                f'"{event["title"]}" starts on {event["start_time"]:%d %b at %I:%M %p}.',
                link=f"/app/opportunities/{event['_id']}",
                dedupe_key=f"reminder:{registration['_id']}",
            )
