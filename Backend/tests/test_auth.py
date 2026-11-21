from conftest import PASSWORD, login, new_admin, new_organization, new_volunteer, register


def test_register_and_login_volunteer(client, db):
    user = register(client, "Asha@Test.com", name="Asha")
    assert user["email"] == "asha@test.com"  # emails are stored lowercase
    assert user["role"] == "volunteer"
    assert "password_hash" not in user
    assert len(user["referral_code"]) == 6

    stored = db.users.find_one({"email": "asha@test.com"})
    assert stored["password_hash"] != PASSWORD  # password is hashed
    assert db.volunteer_profiles.count_documents({"user_id": stored["_id"]}) == 1

    headers = login(client, "asha@test.com")
    me = client.get("/api/v1/auth/me", headers=headers).json()
    assert me["name"] == "Asha"


def test_register_organization_creates_organization(client, db):
    register(client, "org@test.com", role="organization", name="Ravi", org_name="Food For All")
    org = db.organizations.find_one({"name": "Food For All"})
    assert org["verification_status"] == "unverified"


def test_duplicate_email_and_bad_password(client):
    register(client, "a@test.com")
    duplicate = client.post(
        "/api/v1/auth/register",
        json={"name": "Again", "email": "a@test.com", "password": PASSWORD, "role": "volunteer"},
    )
    assert duplicate.status_code == 409

    wrong = client.post("/api/v1/auth/login", json={"email": "a@test.com", "password": "wrong-pass"})
    assert wrong.status_code == 401


def test_cannot_register_as_admin(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Hacker", "email": "h@test.com", "password": PASSWORD, "role": "admin"},
    )
    assert response.status_code == 422


def test_protected_routes_need_login_and_correct_role(client, db):
    assert client.get("/api/v1/auth/me").status_code == 401
    bad_token = {"Authorization": "Bearer not-a-real-token"}
    assert client.get("/api/v1/auth/me", headers=bad_token).status_code == 401

    _, volunteer = new_volunteer(client)
    _, org = new_organization(client)
    assert client.get("/api/v1/admin/stats", headers=volunteer).status_code == 403
    assert client.get("/api/v1/admin/stats", headers=org).status_code == 403
    assert client.get("/api/v1/organizations/me", headers=volunteer).status_code == 403
    assert client.get("/api/v1/volunteers/me", headers=org).status_code == 403

    admin = new_admin(client, db)
    assert client.get("/api/v1/admin/stats", headers=admin).status_code == 200


def test_deactivated_user_is_locked_out(client, db):
    user, headers = new_volunteer(client)
    admin = new_admin(client, db)
    response = client.patch(f"/api/v1/admin/users/{user['id']}", json={"is_active": False}, headers=admin)
    assert response.status_code == 200

    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401  # old token stops working
    failed = client.post("/api/v1/auth/login", json={"email": "vol@test.com", "password": PASSWORD})
    assert failed.status_code == 401


def test_referral_code_must_exist(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "New", "email": "n@test.com", "password": PASSWORD, "role": "volunteer", "referral_code": "NOPE00"},
    )
    assert response.status_code == 400
