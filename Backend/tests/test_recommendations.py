"""Smart volunteer matching (Feature 18) and volunteer profiles (Feature 7)."""

from datetime import datetime, timedelta

from app.utils.matching import score_event
from conftest import create_event, new_organization, new_volunteer

API = "/api/v1"


def next_weekday(day: int, hour: int) -> datetime:
    """day: 0 = Monday ... 6 = Sunday"""
    today = datetime.now()
    days_ahead = (day - today.weekday()) % 7 or 7
    return (today + timedelta(days=days_ahead)).replace(hour=hour, minute=0, second=0, microsecond=0)


def test_recommendations_rank_best_match_first(client):
    _, org = new_organization(client)
    _, vol = new_volunteer(
        client,
        city="Mumbai",
        skills=["Teaching", "English"],
        interests=["Teaching"],
        availability=["Weekends"],
        latitude=19.1334,
        longitude=72.9133,
    )
    saturday = next_weekday(5, 10)
    tuesday = next_weekday(1, 18)

    create_event(
        client, org, title="Weekend English Class", category="Teaching", skills_required=["English"],
        start_time=saturday.isoformat(), end_time=(saturday + timedelta(hours=2)).isoformat(),
        latitude=19.12, longitude=72.91,
    )
    create_event(
        client, org, title="Pune Food Drive", category="Food Distribution", skills_required=["Cooking"],
        start_time=tuesday.isoformat(), end_time=(tuesday + timedelta(hours=2)).isoformat(),
        city="Pune", latitude=18.52, longitude=73.85,
    )
    full = create_event(client, org, title="Full Event", capacity=1)
    _, someone = new_volunteer(client, email="x@test.com")
    client.post(f"{API}/events/{full['id']}/register", headers=someone)

    data = client.get(f"{API}/recommendations", headers=vol).json()
    titles = [r["title"] for r in data["results"]]
    assert titles[0] == "Weekend English Class"
    assert "Full Event" not in titles  # no free spots

    best = data["results"][0]["match"]
    assert best["score"] > 85
    assert set(best["breakdown"]) == {"distance", "skills", "interests", "availability", "history"}
    assert any("skills" in reason for reason in best["reasons"])

    # Events the volunteer already joined are not recommended again.
    client.post(f"{API}/events/{data['results'][0]['id']}/register", headers=vol)
    titles = [r["title"] for r in client.get(f"{API}/recommendations", headers=vol).json()["results"]]
    assert "Weekend English Class" not in titles


def test_score_formula_is_transparent():
    event = {
        "category": "Plantation", "city": "Mumbai", "latitude": 19.0, "longitude": 72.8,
        "skills_required": ["Gardening", "Teamwork"], "time_slot": "Weekends", "organization_id": "org1",
    }
    profile = {
        "city": "Mumbai", "latitude": 19.0, "longitude": 72.8, "skills": ["gardening"],
        "interests": ["plantation"], "availability": ["Weekends"],
    }
    result = score_event(event, profile, past_categories={"plantation"}, past_org_ids=set())
    assert result["breakdown"] == {"distance": 30.0, "skills": 12.5, "interests": 20, "availability": 15, "history": 10}
    assert result["score"] == 88


def test_volunteer_profile_update_and_privacy(client):
    user, vol = new_volunteer(client, city="Mumbai", phone="9876543210", skills=["Teaching", " teaching ", ""])
    profile = client.get(f"{API}/volunteers/me", headers=vol).json()
    assert profile["skills"] == ["Teaching"]  # cleaned and de-duplicated
    assert profile["phone"] == "9876543210"

    _, other = new_volunteer(client, email="other@test.com")
    public = client.get(f"{API}/volunteers/{user['id']}", headers=other).json()
    assert public["city"] == "Mumbai"
    assert "phone" not in public and "email" not in public

    bad = {"city": "", "college": "", "phone": "", "bio": "", "skills": [], "interests": [], "availability": ["Midnight"]}
    assert client.put(f"{API}/volunteers/me", json=bad, headers=vol).status_code == 422
