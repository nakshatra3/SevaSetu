import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import get_db
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(message: str):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def load_user_from_token(token: str) -> dict:
    try:
        payload = decode_access_token(token)
    except jwt.InvalidTokenError:
        raise _unauthorized("Your session is invalid or has expired. Please log in again.")

    user_id = payload.get("sub", "")
    if not ObjectId.is_valid(user_id):
        raise _unauthorized("Invalid token.")

    user = get_db().users.find_one({"_id": ObjectId(user_id)})
    if user is None or not user.get("is_active", False):
        raise _unauthorized("This account is not active.")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise _unauthorized("Please log in first.")
    return load_user_from_token(credentials.credentials)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if credentials is None:
        return None
    try:
        return load_user_from_token(credentials.credentials)
    except HTTPException:
        return None


def require_role(*roles: str):

    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to do this.",
            )
        return user

    return checker
