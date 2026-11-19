
from app.utils.helpers import now


def user_to_dict(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user.get("is_active", False),
        "organization_name": user.get("organization_name"),
        "referral_code": user.get("referral_code"),
        "created_at": user.get("created_at"),
    }


def event_status(event: dict) -> str:
    if event.get("status") == "cancelled":
        return "cancelled"
    current = now()
    if current < event["start_time"]:
        return "upcoming"
    if current <= event["end_time"]:
        return "ongoing"
    return "completed"


def event_to_dict(event: dict, organization: dict = None) -> dict:
    capacity = event["capacity"]
    registered = event.get("registered_count", 0)
    return {
        "id": str(event["_id"]),
        "organization_id": str(event["organization_id"]),
        "organization_name": organization["name"] if organization else "",
        "organization_verified": bool(
            organization and organization.get("verification_status") == "verified"
        ),
        "title": event["title"],
        "description": event["description"],
        "category": event["category"],
        "city": event["city"],
        "address": event.get("address", ""),
        "latitude": event.get("latitude"),
        "longitude": event.get("longitude"),
        "start_time": event["start_time"],
        "end_time": event["end_time"],
        "duration_hours": event["duration_hours"],
        "time_slot": event["time_slot"],
        "skills_required": event.get("skills_required", []),
        "capacity": capacity,
        "registered_count": registered,
        "spots_left": max(capacity - registered, 0),
        "status": event_status(event),
        "created_at": event.get("created_at"),
    }


def organizations_by_id(db, events: list) -> dict:
    ids = list({event["organization_id"] for event in events})
    return {org["_id"]: org for org in db.organizations.find({"_id": {"$in": ids}})}


def events_to_list(db, events: list) -> list:
    orgs = organizations_by_id(db, events)
    return [event_to_dict(event, orgs.get(event["organization_id"])) for event in events]


def organization_rating(db, organization_id) -> tuple:
    reviews = list(db.reviews.find({"organization_id": organization_id}, {"rating": 1}))
    if not reviews:
        return 0.0, 0
    average = sum(r["rating"] for r in reviews) / len(reviews)
    return round(average, 1), len(reviews)


def organization_to_dict(db, org: dict, private: bool = False) -> dict:
    rating_average, rating_count = organization_rating(db, org["_id"])
    attendance = list(db.attendance.find({"organization_id": org["_id"]}))
    events = list(
        db.events.find({"organization_id": org["_id"]}).sort("start_time", -1).limit(30)
    )

    data = {
        "id": str(org["_id"]),
        "user_id": str(org["user_id"]),
        "name": org["name"],
        "description": org.get("description", ""),
        "website": org.get("website", ""),
        "city": org.get("city", ""),
        "address": org.get("address", ""),
        "contact_email": org.get("contact_email", ""),
        "phone": org.get("phone", ""),
        "categories": org.get("categories", []),
        "verification_status": org.get("verification_status", "unverified"),
        "rating_average": rating_average,
        "rating_count": rating_count,
        "stats": {
            "events_hosted": db.events.count_documents(
                {"organization_id": org["_id"], "status": {"$ne": "cancelled"}}
            ),
            "volunteers_engaged": len({a["volunteer_id"] for a in attendance}),
            "hours_delivered": round(sum(a["hours"] for a in attendance), 1),
        },
        "events": [
            {
                "id": str(e["_id"]),
                "title": e["title"],
                "date": e["start_time"],
                "category": e["category"],
                "status": event_status(e),
            }
            for e in events
        ],
        "created_at": org.get("created_at"),
    }

    if private:
        data["verification_note"] = org.get("verification_note", "")
        data["verification_request"] = org.get("verification_request")
    return data
