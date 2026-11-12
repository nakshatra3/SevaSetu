
<<<<<<< Updated upstream
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator
=======

from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, EmailStr, Field, field_validator, model_validator

from app.utils.geo import TIME_SLOTS
from app.utils.helpers import clean_tags, to_naive_local

MAX_TAGS = 20


def validate_tags(values: list[str]) -> list[str]:
    values = clean_tags(values)
    if len(values) > MAX_TAGS:
        raise ValueError(f"Add at most {MAX_TAGS} items.")
    if any(len(v) > 40 for v in values):
        raise ValueError("Each item must be 40 characters or fewer.")
    return values


TagList = Annotated[list[str], AfterValidator(validate_tags)]

>>>>>>> Stashed changes


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["volunteer", "organization"]  # admins are created by the seed script
    organization_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    referral_code: Optional[str] = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def validate_role_fields(self):
        if self.role == "organization" and not self.organization_name:
            raise ValueError("Organization name is required.")
        if self.role == "volunteer" and self.organization_name is not None:
            raise ValueError("Organization name is only for organization accounts.")
        if self.role == "organization" and self.referral_code:
            raise ValueError("Referral codes are only for volunteer accounts.")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


<<<<<<< Updated upstream
class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool
    organization_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
=======
>>>>>>> Stashed changes
