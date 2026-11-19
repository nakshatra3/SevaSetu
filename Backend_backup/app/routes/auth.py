from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.auth import get_current_user
from app.database import get_db
from app.schemas import LoginRequest, RegisterRequest
from app.security import create_access_token
from app.services.auth_service import authenticate_user, register_user
from app.utils.serializers import user_to_dict

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    try:
        user = register_user(get_db(), data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    return user_to_dict(user)


@router.post("/login")
def login(data: LoginRequest):
    user = authenticate_user(get_db(), str(data.email), data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or inactive account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(str(user["_id"]), user["role"])
    return {"access_token": token, "token_type": "bearer", "user": user_to_dict(user)}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user_to_dict(user)
