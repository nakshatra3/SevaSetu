"""Verification, reporting, moderation and admin dashboard (Features 13, 16, 17)."""

from conftest import create_event, new_admin, new_organization, new_volunteer

API = "/api/v1"


def test_verification_flow_keeps_details_private(client, db):
    _, org = new_organization(client)
    _, vol = new_volunteer(client)
    admin = new_admin(client, db)

    request = {"note": "Registered NGO since 2015", "registration_number": "MH/2015/0042"}
    response = client.post(f"{API}/organizations/me/verification-request", json=request, headers=org)
    assert response.status_code == 200
    assert response.json()["verification_status"] == "pending"
    org_id = response.json()["id"]

    # Repeating the request while pending is refused.
    assert client.post(f"{API}/organizations/me/verification-request", json=request, headers=org).status_code == 400

    # Public and volunteer views don't include the private registration details.
    public = client.get(f"{API}/organizations/{org_id}", headers=vol).json()
    assert "verification_request" not in public
    assert public["verification_status"] == "pending"

    pending = client.get(f"{API}/admin/organizations", params={"verification_status": "pending"}, headers=admin).json()
    assert pending[0]["verification_request"]["registration_number"] == "MH/2015/0042"

    decided = client.patch(
        f"{API}/admin/organizations/{org_id}/verification", json={"status": "verified"}, headers=admin
    )
    assert decided.json()["verification_status"] == "verified"
    assert client.get(f"{API}/organizations/me", headers=org).json()["verification_status"] == "verified"
    notes = client.get(f"{API}/notifications", headers=org).json()
    assert notes[0]["title"] == "Organization verified"

    # Only admins decide.
    assert client.patch(
        f"{API}/admin/organizations/{org_id}/verification", json={"status": "verified"}, headers=org
    ).status_code == 403


def test_organization_profile_edit_is_own_only(client):
    _, org = new_organization(client)
    body = {"name": "Green Earth Trust", "description": "We plant trees.", "website": "https://green.org",
            "city": "Mumbai", "address": "Powai", "contact_email": "", "phone": "98200 00000", "categories": ["Plantation"]}
    response = client.put(f"{API}/organizations/me", json=body, headers=org)
    assert response.status_code == 200
    assert response.json()["city"] == "Mumbai"

    bad_site = {**body, "website": "green.org"}
    assert client.put(f"{API}/organizations/me", json=bad_site, headers=org).status_code == 422


def test_reports_and_moderation(client, db):
    _, org = new_organization(client)
    reporter, vol = new_volunteer(client)
    admin = new_admin(client, db)
    event = create_event(client, org)

    report = {"target_type": "event", "target_id": event["id"], "reason": "unsafe", "details": "No safety gear"}
    assert client.post(f"{API}/reports", json=report, headers=vol).status_code == 201
    self_report = {"target_type": "user", "target_id": reporter["id"], "reason": "spam"}
    assert client.post(f"{API}/reports", json=self_report, headers=vol).status_code == 400

    reports = client.get(f"{API}/admin/reports", params={"status": "open"}, headers=admin).json()
    assert reports[0]["target_label"] == "Beach Clean-up Drive"
    assert reports[0]["reporter_name"] == "Asha Volunteer"
    assert client.get(f"{API}/admin/reports", headers=vol).status_code == 403

    # Moderation: admin cancels the event, then resolves the report.
    assert client.post(f"{API}/events/{event['id']}/cancel", headers=admin).status_code == 200
    resolved = client.patch(
        f"{API}/admin/reports/{reports[0]['id']}", json={"status": "resolved", "resolution_note": "Event cancelled"}, headers=admin
    )
    assert resolved.json()["status"] == "resolved"
    stats = client.get(f"{API}/admin/stats", headers=admin).json()
    assert stats["open_reports"] == 0


def test_admin_stats_users_events_and_categories(client, db):
    _, org = new_organization(client)
    new_volunteer(client)
    admin = new_admin(client, db)
    create_event(client, org)

    stats = client.get(f"{API}/admin/stats", headers=admin).json()
    assert stats["volunteers"] == 1
    assert stats["organizations"] == 1
    assert stats["total_events"] == 1

    users = client.get(f"{API}/admin/users", params={"search": "asha"}, headers=admin).json()
    assert [u["name"] for u in users] == ["Asha Volunteer"]
    me = client.get(f"{API}/auth/me", headers=admin).json()
    assert client.patch(f"{API}/admin/users/{me['id']}", json={"is_active": False}, headers=admin).status_code == 400

    assert len(client.get(f"{API}/admin/events", headers=admin).json()) == 1

    created = client.post(f"{API}/categories", json={"name": "Disaster Relief"}, headers=admin)
    assert created.status_code == 201
    assert client.post(f"{API}/categories", json={"name": "disaster relief"}, headers=admin).status_code == 409
    assert client.post(f"{API}/categories", json={"name": "Sports"}, headers=org).status_code == 403

    cleaning = [c for c in client.get(f"{API}/categories").json() if c["name"] == "Cleaning"][0]
    assert client.delete(f"{API}/categories/{cleaning['id']}", headers=admin).status_code == 400  # in use
    assert client.delete(f"{API}/categories/{created.json()['id']}", headers=admin).status_code == 204
