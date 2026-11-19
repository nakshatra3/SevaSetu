def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_default_categories_and_badges_exist(client):
    categories = [c["name"] for c in client.get("/api/v1/categories").json()]
    assert {"Teaching", "Cleaning", "Plantation", "Food Distribution"} <= set(categories)
