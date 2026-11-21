"""Creating notifications.

Notifications are simple documents: {user_id, type, title, body, link, read, created_at}.
Types used: registration, reminder, nearby, achievement, points, donation,
verification, event_update, report.
"""

from datetime import timedelta

from pymongo.errors import DuplicateKeyError

from app.utils.helpers import now


def create_notification(db, user_id, type_, title, body, link="", dedupe_key=None):
    """Save one notification. dedupe_key makes sure it is only created once."""
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
    """Add a reminder for each event the user joined that starts within 24 hours.

    There is no background scheduler: reminders are created when the user
    opens their notifications, and dedupe_key prevents repeats.
    """
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
