from fastapi import APIRouter, Depends

from app.auth import get_current_user, require_role
from app.database import get_db
from app.schemas import VolunteerProfileUpdate
from app.services.auth_service import new_volunteer_profile
from app.utils.helpers import not_found, now, to_object_id

router = APIRouter(prefix="/volunteers", tags=["Volunteer profiles"])


def get_or_create_profile(db, user_id) -> dict:
    profile = db.volunteer_profiles.find_one({"user_id": user_id})
    if profile is None:
        profile = new_volunteer_profile(user_id)
        db.volunteer_profiles.insert_one(profile)
    return profile


def volunteer_history(db, user_id) -> list:
    records = list(db.attendance.find({"volunteer_id": user_id}).sort("checked_in_at", -1))
    events = {e["_id"]: e for e in db.events.find({"_id": {"$in": [r["event_id"] for r in records]}})}
    orgs = {o["_id"]: o for o in db.organizations.find({"_id": {"$in": [r["organization_id"] for r in records]}})}

    history = []
    for record in records:
        event = events.get(record["event_id"], {})
        org = orgs.get(record["organization_id"], {})
        history.append(
            {
                "id": str(record["_id"]),
                "event_id": str(record["event_id"]),
                "event_title": event.get("title", "Deleted event"),
                "category": record.get("category", ""),
                "organization_id": str(record["organization_id"]),
                "organization_name": org.get("name", ""),
                "date": event.get("start_time", record["checked_in_at"]),
                "hours": record["hours"],
                "method": record["method"],
                "feedback": record.get("feedback", ""),
            }
        )
    return history


def profile_to_dict(db, user: dict, private: bool) -> dict:
    profile = get_or_create_profile(db, user["_id"])
    
    data = {
        "id": str(user["_id"]),
        "user_id": str(user["_id"]),
        "name": user["name"],
        "city": profile.get("city", ""),
        "college": profile.get("college", ""),
        "bio": profile.get("bio", ""),
        "skills": profile.get("skills", []),
        "interests": profile.get("interests", []),
        "availability": profile.get("availability", []),
        "history": volunteer_history(db, user["_id"]),
    }
    if private:
        data.update(
            {
                "email": user["email"],
                "phone": profile.get("phone", ""),
                "latitude": profile.get("latitude"),
                "longitude": profile.get("longitude"),
                "referral_code": user.get("referral_code"),
            }
        )
    return data


@router.get("/me")
def get_my_profile(user: dict = Depends(require_role("volunteer"))):
    return profile_to_dict(get_db(), user, private=True)


@router.put("/me")
def update_my_profile(data: VolunteerProfileUpdate, user: dict = Depends(require_role("volunteer"))):
    db = get_db()
    get_or_create_profile(db, user["_id"])
    db.volunteer_profiles.update_one(
        {"user_id": user["_id"]},
        {"$set": {**data.model_dump(), "updated_at": now()}},
    )
    return profile_to_dict(db, user, private=True)


@router.get("/{user_id}")
def get_volunteer(user_id: str, viewer: dict = Depends(get_current_user)):
    db = get_db()
    user = db.users.find_one({"_id": to_object_id(user_id, "Volunteer"), "role": "volunteer"})
    if user is None:
        raise not_found("Volunteer")
    is_self_or_admin = viewer["_id"] == user["_id"] or viewer["role"] == "admin"
    return profile_to_dict(db, user, private=is_self_or_admin)
