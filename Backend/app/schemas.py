

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

# auth

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["volunteer", "organization"] 
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

# profiles

class VolunteerProfileUpdate(BaseModel):
    city: str = Field(default="", max_length=80)
    college: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=20, pattern=r"^[0-9+\- ]*$")
    bio: str = Field(default="", max_length=500)
    skills: TagList = []
    interests: TagList = []
    availability: list[str] = []
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)


    @field_validator("availability")
    @classmethod
    def check_availability(cls, values):
        for value in values:
            if value not in TIME_SLOTS:
                raise ValueError(f"Unknown availability option: {value}")
        return list(dict.fromkeys(values))

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

# events

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


# attendence

class CheckInRequest(BaseModel):
    event_id: str
    code: str = Field(min_length=4, max_length=12)


class VerifyAttendanceRequest(BaseModel):
    volunteer_id: str
    hours: Optional[float] = Field(default=None, gt=0, le=12)
    feedback: str = Field(default="", max_length=300)

#  donation

class DonationCreate(BaseModel):
    organization_id: str
    type: Literal["books", "clothes", "food", "money"]
    amount: Optional[int] = Field(default=None, ge=1, le=10_000_000)  # rupees, for money
    quantity: Optional[int] = Field(default=None, ge=1, le=10_000)  # items/kg, for goods
    description: str = Field(default="", max_length=300)

    @model_validator(mode="after")
    def check_amount_or_quantity(self):
        if self.type == "money":
            if not self.amount:
                raise ValueError("Enter the amount in rupees.")
            self.quantity = None
        else:
            if not self.quantity:
                raise ValueError("Enter how many items (or kg) you are donating.")
            self.amount = None
        return self


class DonationDecision(BaseModel):
    status: Literal["verified", "rejected"]
    note: str = Field(default="", max_length=300)


# reports

class ReviewCreate(BaseModel):
    organization_id: Optional[str] = None
    event_id: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def need_target(self):
        if not self.organization_id and not self.event_id:
            raise ValueError("Choose an organization or an event to review.")
        return self


class ReportCreate(BaseModel):
    target_type: Literal["user", "organization", "event"]
    target_id: str
    reason: Literal["spam", "harassment", "unsafe", "fraud", "other"]
    details: str = Field(default="", max_length=1000)


# admin

class UserStatusUpdate(BaseModel):
    is_active: bool


class VerificationDecision(BaseModel):
    status: Literal["verified", "rejected"]
    note: str = Field(default="", max_length=500)


class ReportDecision(BaseModel):
    status: Literal["resolved", "dismissed"]
    resolution_note: str = Field(default="", max_length=500)


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=50)


class BadgeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    description: str = Field(min_length=5, max_length=200)
    icon: str = Field(default="🏅", max_length=8)
    rule_type: Literal["events", "hours", "category_events", "donations", "referrals", "points"]
    threshold: int = Field(ge=1, le=100000)
    categories: TagList = []


    @model_validator(mode="after")
    def categories_needed(self):
        if self.rule_type == "category_events" and not self.categories:
            raise ValueError("Pick at least one category for a category badge.")
        return self
