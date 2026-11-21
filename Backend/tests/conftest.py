"""Shared test setup.

Tests use mongomock, an in-memory copy of MongoDB, so they run without a
MongoDB server and never touch your real data.
"""

import os
from datetime import datetime, timedelta

# Settings need a secret key before the app is imported.
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"

import mongomock  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import database  # noqa: E402
from app.main import app  # noqa: E402
from app.security import hash_password  # noqa: E402

PASSWORD = "password123"


@pytest.fixture
def db():
    test_db = mongomock.MongoClient()["sevasetu_test"]
    database.db = test_db
    database.setup_database(test_db)  # indexes + default categories and badges
    yield test_db
    database.db = None


@pytest.fixture
def client(db):
    with TestClient(app) as test_client:
        yield test_client


# ---------- helpers used by many tests ----------

def register(client, email, role="volunteer", name="Test User", org_name=None, referral_code=None):
    body = {"name": name, "email": email, "password": PASSWORD, "role": role}
    if org_name:
        body["organization_name"] = org_name
    if referral_code:
        body["referral_code"] = referral_code
    response = client.post("/api/v1/auth/register", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def login(client, email, password=PASSWORD):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def new_volunteer(client, email="vol@test.com", name="Asha Volunteer", **profile):
    user = register(client, email, name=name)
    headers = login(client, email)
    if profile:
        body = {
            "city": "", "college": "", "phone": "", "bio": "", "skills": [],
            "interests": [], "availability": [], **profile,
        }
        response = client.put("/api/v1/volunteers/me", json=body, headers=headers)
        assert response.status_code == 200, response.text
    return user, headers


def new_organization(client, email="org@test.com", org_name="Green Earth Trust"):
    user = register(client, email, role="organization", name="Org Owner", org_name=org_name)
    return user, login(client, email)


def new_admin(client, db, email="admin@test.com"):
    db.users.insert_one(
        {
            "name": "Admin",
            "email": email,
            "password_hash": hash_password(PASSWORD),
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(),
        }
    )
    return login(client, email)


def event_body(**overrides):
    start = (datetime.now() + timedelta(days=3)).replace(hour=9, minute=0, second=0, microsecond=0)
    body = {
        "title": "Beach Clean-up Drive",
        "description": "Help us clean Juhu beach and sort the waste for recycling.",
        "category": "Cleaning",
        "city": "Mumbai",
        "address": "Juhu Beach",
        "latitude": 19.0988,
        "longitude": 72.8267,
        "start_time": start.isoformat(),
        "end_time": (start + timedelta(hours=3)).isoformat(),
        "capacity": 10,
        "skills_required": ["Teamwork"],
    }
    body.update(overrides)
    return body


def create_event(client, org_headers, **overrides):
    response = client.post("/api/v1/events", json=event_body(**overrides), headers=org_headers)
    assert response.status_code == 201, response.text
    return response.json()


def start_event_now(db, event_id, hours=3):
    """Pretend the event started 30 minutes ago (tests can't wait for real time)."""
    from bson import ObjectId

    start = datetime.now().replace(microsecond=0) - timedelta(minutes=30)
    db.events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"start_time": start, "end_time": start + timedelta(hours=hours), "duration_hours": hours}},
    )


def checkin_code(db, event_id):
    from bson import ObjectId

    return db.events.find_one({"_id": ObjectId(event_id)})["checkin_code"]
