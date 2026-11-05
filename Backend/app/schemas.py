
from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


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


class EventCreate(BaseModel):
    """Request body for creating or updating an event."""

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    category: str = Field(min_length=2, max_length=50)
    city: str = Field(min_length=2, max_length=80)
    address: str = Field(default="", max_length=200)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    start_time: datetime
    end_time: datetime
    capacity: int = Field(ge=1, le=1000)
    skills_required: list[str] = Field(default_factory=list)

    @field_validator("start_time", "end_time")
    @classmethod
    def normalize_datetime(cls, value: datetime) -> datetime:
        # The existing events route stores and compares UTC-naive datetimes.
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    @model_validator(mode="after")
    def validate_event_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after the start time.")
        duration_hours = (self.end_time - self.start_time).total_seconds() / 3600
        if duration_hours > 12:
            raise ValueError("An event cannot last more than 12 hours.")
        return self
