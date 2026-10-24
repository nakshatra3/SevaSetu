import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(message: str):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise _unauthorized("Please log in first.")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.InvalidTokenError:
        raise _unauthorized("Your session is invalid or has expired. Please log in again.")

    user_id = payload.get("sub", "")
    if not ObjectId.is_valid(user_id):
        raise _unauthorized("Invalid token.")

    user = await request.app.state.database.users.find_one({"_id": ObjectId(user_id)})
    if user is None or not user.get("is_active", False):
        raise _unauthorized("This account is not active.")
    return user


def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    # Public event listing does not require a token in this stage.
    return None


def require_role(*roles: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to do this.",
            )
        return user
    return checker
