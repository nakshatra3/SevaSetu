
from datetime import datetime, timezone

from app.security import hash_password, verify_password
from app.schemas import RegisterRequest


def serialize_user(user: dict) -> dict:
    """Return safe user fields without the password hash."""
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "is_active": user["is_active"],
        "organization_name": user.get("organization_name"),
    }


async def register_user(users, data: RegisterRequest) -> dict:
    email = str(data.email).strip().lower()

    user = {
        "name": data.name.strip(),
        "email": email,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }

    if data.role == "organization":
        user["organization_name"] = data.organization_name.strip()

    result = await users.insert_one(user)
    user["_id"] = result.inserted_id

    return user


async def authenticate_user(users, email: str, password: str):
    normalized_email = email.strip().lower()

    user = await users.find_one({"email": normalized_email})

    if user is None:
        return None

    if not verify_password(password, user["password_hash"]):
        return None

    if not user.get("is_active", False):
        return None

    return user
