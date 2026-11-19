import secrets
import string

from pymongo.errors import DuplicateKeyError

from app.schemas import RegisterRequest
from app.security import hash_password, verify_password
from app.utils.helpers import bad_request, now

REFERRAL_ALPHABET = string.ascii_uppercase + string.digits


def new_referral_code() -> str:
    return "".join(secrets.choice(REFERRAL_ALPHABET) for _ in range(6))


def new_volunteer_profile(user_id) -> dict:
    return {
        "user_id": user_id,
        "city": "",
        "college": "",
        "phone": "",
        "bio": "",
        "skills": [],
        "interests": [],
        "availability": [],
        "latitude": None,
        "longitude": None,
        "created_at": now(),
    }


def new_organization(user_id, name: str) -> dict:
    return {
        "user_id": user_id,
        "name": name,
        "description": "",
        "website": "",
        "city": "",
        "address": "",
        "contact_email": "",
        "phone": "",
        "categories": [],
        "verification_status": "unverified",
        "verification_note": "",
        "verification_request": None,
        "created_at": now(),
    }


def register_user(db, data: RegisterRequest) -> dict:
    user = {
        "name": data.name.strip(),
        "email": str(data.email).strip().lower(),
        "password_hash": hash_password(data.password),
        "role": data.role,
        "is_active": True,
        "created_at": now(),
    }

    if data.role == "organization":
        user["organization_name"] = data.organization_name.strip()

    if data.role == "volunteer":
        if data.referral_code:
            referrer = db.users.find_one(
                {"referral_code": data.referral_code.strip().upper(), "role": "volunteer"}
            )
            if referrer is None:
                raise bad_request("Referral code not found.")
            user["referred_by"] = referrer["_id"]

    for _ in range(5):
        if data.role == "volunteer":
            user["referral_code"] = new_referral_code()
        try:
            result = db.users.insert_one(user)
            break
        except DuplicateKeyError as error:
            if "referral_code" not in str(error):
                raise  
            user.pop("_id", None)
    user["_id"] = result.inserted_id

    if data.role == "volunteer":
        db.volunteer_profiles.insert_one(new_volunteer_profile(user["_id"]))
    else:
        db.organizations.insert_one(new_organization(user["_id"], user["organization_name"]))

    return user


def authenticate_user(db, email: str, password: str):
    user = db.users.find_one({"email": email.strip().lower()})

    if user is None:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    if not user.get("is_active", False):
        return None
    return user
