from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import settings

# Argon2 password hashing (recommended by pwdlib). Plain passwords are never stored.
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jwt.InvalidTokenError if the token is wrong or expired."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "iat", "exp"]},
    )
