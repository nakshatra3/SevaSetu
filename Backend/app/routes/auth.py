
from fastapi import APIRouter, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from app.schemas import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse,
)
from app.security import create_access_token
from app.services.auth_service import (
    register_user,
    authenticate_user,
    serialize_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(data: RegisterRequest, request: Request):
    users = request.app.state.database.users

    try:
        user = await register_user(users, data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return serialize_user(user)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request):
    users = request.app.state.database.users

    user = await authenticate_user(
        users,
        str(data.email),
        data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or inactive account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(str(user["_id"]))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }
