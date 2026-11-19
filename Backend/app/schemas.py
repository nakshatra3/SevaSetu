
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    role: Literal["volunteer", "organization"]

    organization_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    @model_validator(mode="after")
    def validate_organization(self):
        if self.role == "organization" and not self.organization_name:
            raise ValueError("Organization name is required.")

        if self.role == "volunteer" and self.organization_name is not None:
            raise ValueError(
                "Organization name is only for organization accounts."
            )

        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


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
