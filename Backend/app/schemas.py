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

class OrganizationUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str = Field(default="", max_length=1000)
    website: str = Field(default="", max_length=200)
    city: str = Field(default="", max_length=80)
    address: str = Field(default="", max_length=200)
    contact_email: Optional[EmailStr] = None
    phone: str = Field(default="", max_length=20, pattern=r"^[0-9+\- ]*$")
    categories: TagList = []

    @field_validator("contact_email", mode="before")
    @classmethod
    def empty_email_is_none(cls, value):
        return value or None

    @field_validator("website")
    @classmethod
    def check_website(cls, value):
        value = value.strip()
        if value and not value.lower().startswith(("http://", "https://")):
            raise ValueError("Start the address with http:// or https://")
        return value

class VerificationRequest(BaseModel):
    note: str = Field(default="", max_length=1000)
    registration_number: str = Field(default="", max_length=50)

class EventCreate(BaseModel):
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
    skills_required: TagList = []

    @field_validator("start_time", "end_time")
    @classmethod
    def strip_timezone(cls, value):
        return to_naive_local(value)

    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after the start time.")
        hours = (self.end_time - self.start_time).total_seconds() / 3600
        if hours > 12:
            raise ValueError("An event can last at most 12 hours. Create separate events for longer drives.")
        return self
