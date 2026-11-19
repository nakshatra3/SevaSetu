from conftest import create_event, new_organization, new_volunteer, start_event_now

API = "/api/v1/events"


def test_register_and_prevent_duplicates(client):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    event = create_event(client, org)

    first = client.post(f"{API}/{event['id']}/register", headers=vol)
    assert first.status_code == 200
    assert first.json()["event"]["registered_count"] == 1

    second = client.post(f"{API}/{event['id']}/register", headers=vol)
    assert second.status_code == 409
    assert client.get(f"{API}/{event['id']}").json()["registered_count"] == 1

    details = client.get(f"{API}/{event['id']}", headers=vol).json()
    assert details["my_registration_status"] == "registered"


def test_capacity_prevents_overbooking(client):
    _, org = new_organization(client)
    event = create_event(client, org, capacity=2)

    results = []
    for i in range(3):
        _, vol = new_volunteer(client, email=f"v{i}@test.com")
        results.append(client.post(f"{API}/{event['id']}/register", headers=vol).status_code)

    assert results == [200, 200, 400]
    assert client.get(f"{API}/{event['id']}").json()["spots_left"] == 0


def test_cancel_frees_spot_and_allows_rejoin(client):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    _, vol2 = new_volunteer(client, email="v2@test.com")
    event = create_event(client, org, capacity=1)

    client.post(f"{API}/{event['id']}/register", headers=vol)
    assert client.post(f"{API}/{event['id']}/register", headers=vol2).status_code == 400  # full

    cancel = client.post(f"{API}/{event['id']}/cancel-registration", headers=vol)
    assert cancel.status_code == 200
    assert cancel.json()["event"]["registered_count"] == 0
    assert client.post(f"{API}/{event['id']}/cancel-registration", headers=vol).status_code == 400

    assert client.post(f"{API}/{event['id']}/register", headers=vol2).status_code == 200
    assert client.post(f"{API}/{event['id']}/cancel-registration", headers=vol2).status_code == 200
    assert client.post(f"{API}/{event['id']}/register", headers=vol).status_code == 200  # rejoin


def test_cannot_register_or_cancel_after_start(client, db):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    _, late = new_volunteer(client, email="late@test.com")
    event = create_event(client, org)
    client.post(f"{API}/{event['id']}/register", headers=vol)

    start_event_now(db, event["id"])
    assert client.post(f"{API}/{event['id']}/register", headers=late).status_code == 400
    assert client.post(f"{API}/{event['id']}/cancel-registration", headers=vol).status_code == 400


def test_my_registrations_upcoming_and_past(client, db):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    soon = create_event(client, org, title="Soon")
    later = create_event(client, org, title="Done already")
    client.post(f"{API}/{soon['id']}/register", headers=vol)
    client.post(f"{API}/{later['id']}/register", headers=vol)

    # Move one event into the past.
    from datetime import datetime, timedelta
    from bson import ObjectId

    past = datetime.now() - timedelta(days=2)
    db.events.update_one(
        {"_id": ObjectId(later["id"])},
        {"$set": {"start_time": past, "end_time": past + timedelta(hours=2)}},
    )

    upcoming = client.get("/api/v1/registrations/me", params={"scope": "upcoming"}, headers=vol).json()
    previous = client.get("/api/v1/registrations/me", params={"scope": "past"}, headers=vol).json()
    assert [r["event"]["title"] for r in upcoming] == ["Soon"]
    assert [r["event"]["title"] for r in previous] == ["Done already"]


def test_participants_visible_to_owner_only(client):
    _, org = new_organization(client)
    _, other = new_organization(client, email="other@test.com", org_name="Other NGO")
    _, vol = new_volunteer(client, name="Priya")
    event = create_event(client, org)
    client.post(f"{API}/{event['id']}/register", headers=vol)

    response = client.get(f"{API}/{event['id']}/participants", headers=org)
    assert response.status_code == 200
    assert [p["name"] for p in response.json()["participants"]] == ["Priya"]
    assert client.get(f"{API}/{event['id']}/participants", headers=other).status_code == 403
    assert client.get(f"{API}/{event['id']}/participants", headers=vol).status_code == 403
