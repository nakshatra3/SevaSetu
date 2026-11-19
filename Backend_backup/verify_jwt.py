
import jwt

from app.config import settings

token = input("Paste your login access token: ").strip()

try:
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "iat", "exp"]},
    )

    print("JWT signature: VALID")
    print("User ID:", payload["sub"])
    print("Issued at:", payload["iat"])
    print("Expires at:", payload["exp"])

except jwt.InvalidTokenError as exc:
    print("JWT verification FAILED:", exc)
