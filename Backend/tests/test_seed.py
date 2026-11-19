"""The seed script builds demo data with the real helpers, so the numbers must add up."""

import seed
from app.config import settings
from app.utils.gamification import get_volunteer_stats


def test_seed_creates_consistent_demo_data(db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAIL", "admin@sevasetu.demo")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "AdminPass123")
    monkeypatch.setattr(settings, "DEMO_PASSWORD", "DemoPass123")

    seed.create_admin(db)
    seed.seed_demo_data(db)
    seed.seed_demo_data(db)  # running it twice must not duplicate anything

    assert db.users.count_documents({"role": "admin"}) == 1
    assert db.users.count_documents({"role": "volunteer"}) == 4
    assert db.events.count_documents({}) == 13

    asha = db.users.find_one({"email": "asha@sevasetu.demo"})
    stats = get_volunteer_stats(db, asha["_id"])
    # 12 verified hours x 10 + 2 referrals x 25 + 12 donated books x 2
    assert stats["total_hours"] == 12
    assert stats["points"] == 120 + 50 + 24
    assert stats["referrals"] == 2

    # Every event's registered_count matches its registrations.
    for event in db.events.find():
        active = db.registrations.count_documents({"event_id": event["_id"], "status": {"$ne": "cancelled"}})
        assert event["registered_count"] == active
