"""Reviews (Feature 14) and notifications (Feature 15)."""

from datetime import datetime, timedelta

from bson import ObjectId

from conftest import create_event, new_organization, new_volunteer, start_event_now

API = "/api/v1"


def test_only_attendees_can_review_once(client, db):
    _, org = new_organization(client)
    user, vol = new_volunteer(client)
    org_id = client.get(f"{API}/organizations/me", headers=org).json()["id"]
    event = create_event(client, org)
    client.post(f"{API}/events/{event['id']}/register", headers=vol)

    review = {"event_id": event["id"], "rating": 5, "comment": "Well organised!"}
    assert client.post(f"{API}/reviews", json=review, headers=vol).status_code == 400  # not attended yet
    eligibility = client.get(f"{API}/reviews/eligibility", params={"event_id": event["id"]}, headers=vol).json()
    assert eligibility["can_review"] is False

    start_event_now(db, event["id"])
    client.post(f"{API}/attendance/events/{event['id']}/verify", json={"volunteer_id": user["id"]}, headers=org)

    assert client.post(f"{API}/reviews", json=review, headers=vol).status_code == 201
    assert client.post(f"{API}/reviews", json=review, headers=vol).status_code == 400  # only once

    org_review = {"organization_id": org_id, "rating": 3, "comment": "Good NGO"}
    assert client.post(f"{API}/reviews", json=org_review, headers=vol).status_code == 201

    profile = client.get(f"{API}/organizations/{org_id}").json()
    assert profile["rating_count"] == 2
    assert profile["rating_average"] == 4.0
    reviews = client.get(f"{API}/reviews", params={"event_id": event["id"]}).json()
    assert reviews[0]["reviewer_name"] == "Asha Volunteer"


def test_rating_must_be_1_to_5(client):
    _, vol = new_volunteer(client)
    response = client.post(f"{API}/reviews", json={"organization_id": str(ObjectId()), "rating": 9}, headers=vol)
    assert response.status_code == 422


def test_notifications_flow(client, db):
    _, org = new_organization(client)
    _, vol = new_volunteer(client, city="Mumbai")

    # A new event in the volunteer's city creates a "nearby" notification.
    event = create_event(client, org, city="Mumbai")
    notes = client.get(f"{API}/notifications", headers=vol).json()
    assert notes[0]["type"] == "nearby"

    client.post(f"{API}/events/{event['id']}/register", headers=vol)
    count = client.get(f"{API}/notifications/unread-count", headers=vol).json()["count"]
    assert count == 2

    first_id = client.get(f"{API}/notifications", headers=vol).json()[0]["id"]
    assert client.post(f"{API}/notifications/{first_id}/read", headers=vol).json()["read"] is True
    assert client.get(f"{API}/notifications/unread-count", headers=vol).json()["count"] == 1

    client.post(f"{API}/notifications/read-all", headers=vol)
    assert client.get(f"{API}/notifications/unread-count", headers=vol).json()["count"] == 0

    # Someone else can't read my notifications.
    _, other = new_volunteer(client, email="other@test.com")
    assert client.post(f"{API}/notifications/{first_id}/read", headers=other).status_code == 404


def test_event_reminder_created_once(client, db):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    event = create_event(client, org)
    client.post(f"{API}/events/{event['id']}/register", headers=vol)

    tomorrow = datetime.now() + timedelta(hours=5)
    db.events.update_one(
        {"_id": ObjectId(event["id"])},
        {"$set": {"start_time": tomorrow, "end_time": tomorrow + timedelta(hours=2)}},
    )
    client.get(f"{API}/notifications", headers=vol)
    notes = client.get(f"{API}/notifications", headers=vol).json()
    assert [n["type"] for n in notes].count("reminder") == 1
