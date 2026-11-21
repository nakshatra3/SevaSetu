from datetime import datetime, timedelta

from conftest import create_event, event_body, new_organization, new_volunteer

API = "/api/v1/events"


def test_organization_creates_and_views_event(client):
    _, org = new_organization(client)
    event = create_event(client, org, title="Saturday Teaching Class", category="Teaching")
    assert event["registered_count"] == 0
    assert event["spots_left"] == 10
    assert event["duration_hours"] == 3
    assert event["status"] == "upcoming"
    assert "checkin_code" not in event  # secret code is never in event responses

    details = client.get(f"{API}/{event['id']}").json()
    assert details["title"] == "Saturday Teaching Class"
    assert details["organization_name"] == "Green Earth Trust"
    assert "checkin_code" not in details


def test_only_organizations_create_events(client):
    _, volunteer = new_volunteer(client)
    assert client.post(API, json=event_body(), headers=volunteer).status_code == 403
    assert client.post(API, json=event_body()).status_code == 401


def test_event_validation(client):
    _, org = new_organization(client)
    start = datetime.now() + timedelta(days=1)
    bad_times = event_body(start_time=start.isoformat(), end_time=(start - timedelta(hours=1)).isoformat())
    assert client.post(API, json=bad_times, headers=org).status_code == 422

    past = datetime.now() - timedelta(days=1)
    in_past = event_body(start_time=past.isoformat(), end_time=(past + timedelta(hours=2)).isoformat())
    assert client.post(API, json=in_past, headers=org).status_code == 400

    assert client.post(API, json=event_body(category="Rocket Science"), headers=org).status_code == 400
    assert client.post(API, json=event_body(capacity=0), headers=org).status_code == 422
    assert client.post(API, json=event_body(title=""), headers=org).status_code == 422


def test_only_owner_can_edit_or_cancel(client):
    _, owner = new_organization(client)
    _, other = new_organization(client, email="other@test.com", org_name="Other NGO")
    event = create_event(client, owner)

    changed = event_body(title="Bigger Beach Clean-up", capacity=20)
    assert client.put(f"{API}/{event['id']}", json=changed, headers=other).status_code == 403
    assert client.post(f"{API}/{event['id']}/cancel", headers=other).status_code == 403

    response = client.put(f"{API}/{event['id']}", json=changed, headers=owner)
    assert response.status_code == 200
    assert response.json()["title"] == "Bigger Beach Clean-up"


def test_capacity_cannot_go_below_registrations(client):
    _, org = new_organization(client)
    event = create_event(client, org, capacity=5)
    for i in range(3):
        _, vol = new_volunteer(client, email=f"v{i}@test.com")
        client.post(f"{API}/{event['id']}/register", headers=vol)

    response = client.put(f"{API}/{event['id']}", json=event_body(capacity=2), headers=org)
    assert response.status_code == 400


def test_cancel_event_notifies_registered_volunteers(client, db):
    _, org = new_organization(client)
    user, vol = new_volunteer(client)
    event = create_event(client, org)
    client.post(f"{API}/{event['id']}/register", headers=vol)

    response = client.post(f"{API}/{event['id']}/cancel", headers=org)
    assert response.json()["status"] == "cancelled"
    titles = [n["title"] for n in client.get("/api/v1/notifications", headers=vol).json()]
    assert "Event cancelled" in titles

    # Cancelled events disappear from search.
    assert client.get(API).json() == []


def test_search_and_filters(client):
    _, org = new_organization(client)
    monday = datetime.now() + timedelta(days=(7 - datetime.now().weekday()) % 7 + 7)
    saturday = monday + timedelta(days=5)

    create_event(
        client, org, title="Math Tutoring", category="Teaching", skills_required=["Teaching", "Maths"],
        start_time=monday.replace(hour=9).isoformat(), end_time=monday.replace(hour=11).isoformat(),
        city="Mumbai", latitude=19.1334, longitude=72.9133,  # Powai
    )
    create_event(
        client, org, title="Tree Plantation", category="Plantation", skills_required=["Gardening"],
        start_time=saturday.replace(hour=7).isoformat(), end_time=saturday.replace(hour=12).isoformat(),
        city="Pune", latitude=18.5204, longitude=73.8567, capacity=1,
    )

    def titles(**params):
        response = client.get(API, params=params)
        assert response.status_code == 200, response.text
        return [e["title"] for e in response.json()]

    assert titles() == ["Math Tutoring", "Tree Plantation"]
    assert titles(q="tutor") == ["Math Tutoring"]
    assert titles(category="Plantation") == ["Tree Plantation"]
    assert titles(city="pune") == ["Tree Plantation"]
    assert titles(skills="gardening") == ["Tree Plantation"]
    assert titles(time_slot="Weekends") == ["Tree Plantation"]
    assert titles(time_slot="Weekday mornings") == ["Math Tutoring"]
    assert titles(min_hours=4) == ["Tree Plantation"]
    assert titles(max_hours=2) == ["Math Tutoring"]
    assert titles(date_from=saturday.date().isoformat()) == ["Tree Plantation"]
    assert titles(date_to=monday.date().isoformat()) == ["Math Tutoring"]

    # Location: 10 km around IIT Bombay finds only the Powai event.
    nearby = client.get(API, params={"lat": 19.1334, "lng": 72.9133, "radius_km": 10}).json()
    assert [e["title"] for e in nearby] == ["Math Tutoring"]
    assert nearby[0]["distance_km"] < 1
    far = client.get(API, params={"lat": 19.1334, "lng": 72.9133, "radius_km": 200, "sort": "distance"}).json()
    assert [e["title"] for e in far] == ["Math Tutoring", "Tree Plantation"]

    # Availability of spots: fill the 1-spot event.
    plantation = [e for e in client.get(API).json() if e["title"] == "Tree Plantation"][0]
    _, vol = new_volunteer(client)
    client.post(f"{API}/{plantation['id']}/register", headers=vol)
    assert titles(has_spots="true") == ["Math Tutoring"]


def test_my_events_lists_own_events_only(client):
    _, org = new_organization(client)
    _, other = new_organization(client, email="other@test.com", org_name="Other NGO")
    create_event(client, org, title="Mine")
    create_event(client, other, title="Not mine")
    mine = client.get(f"{API}/mine", headers=org).json()
    assert [e["title"] for e in mine] == ["Mine"]
