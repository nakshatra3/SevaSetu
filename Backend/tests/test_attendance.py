from conftest import (
    checkin_code,
    create_event,
    login,
    new_organization,
    new_volunteer,
    register,
    start_event_now,
)

API = "/api/v1"


def setup_running_event(client, db, hours=3, **event_fields):
    _, org = new_organization(client)
    user, vol = new_volunteer(client)
    event = create_event(client, org, **event_fields)
    client.post(f"{API}/events/{event['id']}/register", headers=vol)
    start_event_now(db, event["id"], hours=hours)
    return org, user, vol, event


def test_qr_checkin_gives_hours_points_and_badge_once(client, db):
    org, user, vol, event = setup_running_event(client, db, hours=3)

    wrong = client.post(f"{API}/attendance/checkin", json={"event_id": event["id"], "code": "WRONG1"}, headers=vol)
    assert wrong.status_code == 400

    code = client.get(f"{API}/attendance/events/{event['id']}/code", headers=org).json()["code"]
    assert code == checkin_code(db, event["id"])
    assert client.get(f"{API}/attendance/events/{event['id']}/code", headers=vol).status_code == 403

    ok = client.post(f"{API}/attendance/checkin", json={"event_id": event["id"], "code": code.lower()}, headers=vol)
    assert ok.status_code == 200, ok.text
    assert ok.json()["hours"] == 3
    assert ok.json()["points"] == 30

    again = client.post(f"{API}/attendance/checkin", json={"event_id": event["id"], "code": code}, headers=vol)
    assert again.status_code == 409  # no duplicate attendance

    profile = client.get(f"{API}/volunteers/me", headers=vol).json()
    assert profile["total_hours"] == 3
    assert profile["points"] == 30
    assert profile["completed_activities"] == 1
    assert [b["title"] for b in profile["achievements"]] == ["First Step"]
    assert profile["history"][0]["event_title"] == event["title"]

    assert db.points_ledger.count_documents({}) == 1
    assert db.user_badges.count_documents({}) == 1


def test_qr_checkin_only_during_event_window(client, db):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    event = create_event(client, org)  # starts in 3 days
    client.post(f"{API}/events/{event['id']}/register", headers=vol)
    code = checkin_code(db, event["id"])
    early = client.post(f"{API}/attendance/checkin", json={"event_id": event["id"], "code": code}, headers=vol)
    assert early.status_code == 400


def test_checkin_requires_registration(client, db):
    _, org = new_organization(client)
    _, stranger = new_volunteer(client, email="stranger@test.com")
    event = create_event(client, org)
    start_event_now(db, event["id"])
    code = checkin_code(db, event["id"])
    response = client.post(f"{API}/attendance/checkin", json={"event_id": event["id"], "code": code}, headers=stranger)
    assert response.status_code == 400


def test_organizer_verification_caps_hours(client, db):
    org, user, vol, event = setup_running_event(client, db, hours=2)

    too_many = client.post(
        f"{API}/attendance/events/{event['id']}/verify",
        json={"volunteer_id": user["id"], "hours": 8},
        headers=org,
    )
    assert too_many.status_code == 200
    assert too_many.json()["hours"] == 2  # capped to the event length

    duplicate = client.post(
        f"{API}/attendance/events/{event['id']}/verify", json={"volunteer_id": user["id"]}, headers=org
    )
    assert duplicate.status_code == 409

    participants = client.get(f"{API}/events/{event['id']}/participants", headers=org).json()["participants"]
    assert participants[0]["status"] == "attended"
    assert participants[0]["hours"] == 2


def test_organizer_can_give_fewer_hours_with_feedback(client, db):
    org, user, vol, event = setup_running_event(client, db, hours=4)
    response = client.post(
        f"{API}/attendance/events/{event['id']}/verify",
        json={"volunteer_id": user["id"], "hours": 1.5, "feedback": "Left early but very helpful"},
        headers=org,
    )
    assert response.json()["hours"] == 1.5
    assert response.json()["points"] == 15
    history = client.get(f"{API}/volunteers/me", headers=vol).json()["history"]
    assert history[0]["feedback"] == "Left early but very helpful"


def test_other_organization_cannot_verify(client, db):
    org, user, vol, event = setup_running_event(client, db)
    _, other = new_organization(client, email="other@test.com", org_name="Other NGO")
    response = client.post(
        f"{API}/attendance/events/{event['id']}/verify", json={"volunteer_id": user["id"]}, headers=other
    )
    assert response.status_code == 403


def test_referral_points_only_after_first_verified_activity(client, db):
    referrer, referrer_headers = new_volunteer(client, email="ref@test.com", name="Referrer")
    register(client, "new@test.com", name="Newbie", referral_code=referrer["referral_code"])
    newbie_headers = login(client, "new@test.com")
    newbie = client.get(f"{API}/auth/me", headers=newbie_headers).json()

    # Signing up alone earns nothing.
    assert client.get(f"{API}/points/me", headers=referrer_headers).json()["total_points"] == 0

    _, org = new_organization(client)
    for title in ["First event", "Second event"]:
        event = create_event(client, org, title=title)
        client.post(f"{API}/events/{event['id']}/register", headers=newbie_headers)
        start_event_now(db, event["id"])
        client.post(f"{API}/attendance/events/{event['id']}/verify", json={"volunteer_id": newbie["id"]}, headers=org)

    points = client.get(f"{API}/points/me", headers=referrer_headers).json()
    assert points["total_points"] == 25  # once, not twice
    assert points["history"][0]["kind"] == "referral"
