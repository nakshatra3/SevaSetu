"""Donations, points, badges and leaderboards (Features 9, 10, 11, 12)."""

from conftest import create_event, new_admin, new_organization, new_volunteer, start_event_now

API = "/api/v1"


def attend(client, db, org, vol, volunteer_id, **event_fields):
    event = create_event(client, org, **event_fields)
    client.post(f"{API}/events/{event['id']}/register", headers=vol)
    start_event_now(db, event["id"], hours=event_fields.get("hours", 3))
    response = client.post(
        f"{API}/attendance/events/{event['id']}/verify", json={"volunteer_id": volunteer_id}, headers=org
    )
    assert response.status_code == 200, response.text
    return event


def test_donation_points_only_when_verified_and_only_once(client, db):
    org_user, org = new_organization(client)
    _, vol = new_volunteer(client)
    org_id = client.get(f"{API}/organizations/me", headers=org).json()["id"]

    donation = client.post(
        f"{API}/donations", json={"organization_id": org_id, "type": "money", "amount": 2500}, headers=vol
    )
    assert donation.status_code == 201
    assert donation.json()["status"] == "pending"
    assert client.get(f"{API}/points/me", headers=vol).json()["total_points"] == 0

    donation_id = donation.json()["id"]
    verified = client.patch(f"{API}/donations/{donation_id}", json={"status": "verified"}, headers=org)
    assert verified.status_code == 200
    assert verified.json()["points_awarded"] == 25  # 1 point per Rs 100

    again = client.patch(f"{API}/donations/{donation_id}", json={"status": "verified"}, headers=org)
    assert again.status_code == 400
    assert client.get(f"{API}/points/me", headers=vol).json()["total_points"] == 25

    mine = client.get(f"{API}/donations/me", headers=vol).json()
    assert mine[0]["organization_name"] == "Green Earth Trust"
    received = client.get(f"{API}/donations/received", headers=org).json()
    assert received[0]["status"] == "verified"


def test_donation_validation_and_ownership(client):
    _, org = new_organization(client)
    _, other = new_organization(client, email="other@test.com", org_name="Other NGO")
    _, vol = new_volunteer(client)
    org_id = client.get(f"{API}/organizations/me", headers=org).json()["id"]

    no_amount = client.post(f"{API}/donations", json={"organization_id": org_id, "type": "money"}, headers=vol)
    assert no_amount.status_code == 422
    books = client.post(
        f"{API}/donations", json={"organization_id": org_id, "type": "books", "quantity": 40}, headers=vol
    )
    assert books.status_code == 201

    wrong_org = client.patch(f"{API}/donations/{books.json()['id']}", json={"status": "verified"}, headers=other)
    assert wrong_org.status_code == 403
    rejected = client.patch(f"{API}/donations/{books.json()['id']}", json={"status": "rejected"}, headers=org)
    assert rejected.json()["status"] == "rejected"
    assert client.get(f"{API}/points/me", headers=vol).json()["total_points"] == 0


def test_green_warrior_badge(client, db):
    _, org = new_organization(client)
    user, vol = new_volunteer(client)
    attend(client, db, org, vol, user["id"], title="Plant 1", category="Plantation")
    attend(client, db, org, vol, user["id"], title="Clean 1", category="Cleaning")

    def earned():
        return {b["name"] for b in client.get(f"{API}/badges", headers=vol).json() if b["earned"]}

    assert "Green Warrior" not in earned()
    attend(client, db, org, vol, user["id"], title="Plant 2", category="Plantation")
    assert "Green Warrior" in earned()

    badges = {b["name"]: b for b in client.get(f"{API}/badges", headers=vol).json()}
    assert badges["Community Hero"]["progress"] == 3
    assert badges["100-Hour Volunteer"]["progress"] == 9  # 3 events x 3 hours
    assert db.user_badges.count_documents({"user_id": db.users.find_one({"email": "vol@test.com"})["_id"]}) == 2


def test_leaderboards_use_real_points(client, db):
    _, org = new_organization(client)
    _, org2 = new_organization(client, email="org2@test.com", org_name="Food Bank")
    asha, asha_h = new_volunteer(client, email="asha@test.com", name="Asha", city="Mumbai", college="IIT Bombay")
    ravi, ravi_h = new_volunteer(client, email="ravi@test.com", name="Ravi", city="Pune", college="COEP")
    meera, meera_h = new_volunteer(client, email="meera@test.com", name="Meera", city="Mumbai", college="VJTI")

    attend(client, db, org, asha_h, asha["id"], title="Asha event 1")  # 30 points each event
    attend(client, db, org, asha_h, asha["id"], title="Asha event 2")
    attend(client, db, org2, ravi_h, ravi["id"], title="Ravi event 1")
    attend(client, db, org2, meera_h, meera["id"], title="Meera event 1")
    attend(client, db, org2, meera_h, meera["id"], title="Meera event 2")
    attend(client, db, org2, meera_h, meera["id"], title="Meera event 3")

    def board(**params):
        response = client.get(f"{API}/leaderboards", params=params, headers=asha_h)
        assert response.status_code == 200, response.text
        return [(e["name"], e["points"]) for e in response.json()["entries"]]

    assert board() == [("Meera", 90), ("Asha", 60), ("Ravi", 30)]
    assert board(scope="city") == [("Meera", 90), ("Asha", 60)]  # defaults to my city
    assert board(scope="city", value="pune") == [("Ravi", 30)]
    assert board(scope="college", value="IIT Bombay") == [("Asha", 60)]
    assert board(scope="monthly")[0] == ("Meera", 90)

    org_id = client.get(f"{API}/organizations/me", headers=org).json()["id"]
    assert board(scope="organization", value=org_id) == [("Asha", 60)]

    data = client.get(f"{API}/leaderboards", headers=asha_h).json()
    assert data["my_rank"] == 2

    options = client.get(f"{API}/leaderboards/options", headers=asha_h).json()
    assert options["cities"] == ["Mumbai", "Pune"]


def test_admin_can_add_badge_and_existing_volunteers_get_it(client, db):
    _, org = new_organization(client)
    user, vol = new_volunteer(client)
    attend(client, db, org, vol, user["id"])
    admin = new_admin(client, db)

    body = {"name": "Early Bird", "description": "Earn 20 points.", "icon": "🐦", "rule_type": "points", "threshold": 20}
    assert client.post(f"{API}/badges", json=body, headers=vol).status_code == 403
    created = client.post(f"{API}/badges", json=body, headers=admin)
    assert created.status_code == 201
    earned = {b["name"] for b in client.get(f"{API}/badges", headers=vol).json() if b["earned"]}
    assert "Early Bird" in earned
