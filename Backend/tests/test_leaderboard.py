"""Run from Backend: python -m unittest discover -s tests -v"""
import os
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-only")

import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.routes.leaderboard import badge, score, confirm_contribution


class ScoreTests(unittest.TestCase):
    def test_points_and_badge_boundaries(self):
        self.assertEqual(score(2), 20)
        self.assertEqual(score(1.25), 13)
        self.assertEqual([badge(p) for p in [0, 49, 50, 199, 200]],
                         ["Helping Hand", "Helping Hand", "Changemaker", "Changemaker", "Community Hero"])


class ConfirmationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.owner = {"_id": ObjectId(), "role": "organization"}
        self.event_id, self.volunteer_id = ObjectId(), ObjectId()
        self.event = {"_id": self.event_id, "organization_id": self.owner["_id"],
                      "start_time": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=3),
                      "end_time": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)}
        self.db = SimpleNamespace(events=SimpleNamespace(find_one=AsyncMock(return_value=self.event)),
            users=SimpleNamespace(find_one=AsyncMock(return_value={"_id": self.volunteer_id})),
            contributions=SimpleNamespace(update_one=AsyncMock(return_value=SimpleNamespace(upserted_id="new"))))
        self.request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(database=self.db)))

    async def call(self):
        return await confirm_contribution(str(self.event_id), str(self.volunteer_id), self.request, self.owner)

    async def test_confirmation_derives_points_and_uses_insert_only(self):
        self.assertTrue((await self.call())["created"])
        query, update = self.db.contributions.update_one.call_args.args
        self.assertEqual(query["_id"], f"{self.event_id}:{self.volunteer_id}")
        self.assertEqual(update["$setOnInsert"]["points"], 20)
        self.db.contributions.update_one.assert_awaited_once()

    async def test_repeat_and_concurrent_confirmation_do_not_award_again(self):
        self.db.contributions.update_one.return_value = SimpleNamespace(upserted_id=None)
        self.assertFalse((await self.call())["created"])
        self.db.contributions.update_one.side_effect = DuplicateKeyError("duplicate")
        self.assertFalse((await self.call())["created"])

    async def test_other_organization_rejected(self):
        self.event["organization_id"] = ObjectId()
        with self.assertRaises(HTTPException) as error:
            await self.call()
        self.assertEqual(error.exception.status_code, 403)
        self.db.contributions.update_one.assert_not_awaited()

    async def test_future_event_rejected(self):
        self.event["end_time"] = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        with self.assertRaises(HTTPException) as error:
            await self.call()
        self.assertEqual(error.exception.status_code, 400)

    async def test_missing_volunteer_rejected(self):
        self.db.users.find_one.return_value = None
        with self.assertRaises(HTTPException) as error:
            await self.call()
        self.assertEqual(error.exception.status_code, 404)

    async def test_invalid_id_rejected(self):
        with self.assertRaises(HTTPException) as error:
            await confirm_contribution("bad", str(self.volunteer_id), self.request, self.owner)
        self.assertEqual(error.exception.status_code, 422)


class RouteTests(unittest.TestCase):
    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from app.routes.leaderboard import router
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api/v1")
        self.client = TestClient(self.app)

    def test_anonymous_read_and_write_require_login(self):
        self.assertEqual(self.client.get("/api/v1/leaderboard").status_code, 401)
        self.assertEqual(self.client.put(f"/api/v1/contributions/{ObjectId()}/{ObjectId()}").status_code, 401)

    def test_volunteer_cannot_confirm(self):
        from app.auth import get_current_user
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "volunteer"}
        self.assertEqual(self.client.put(f"/api/v1/contributions/{ObjectId()}/{ObjectId()}").status_code, 403)

    def test_leaderboard_response_and_limit_validation(self):
        from app.auth import get_current_user
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "volunteer"}
        row = {"_id": ObjectId(), "name": "Asha", "points": 50, "hours": 5, "completed_events": 2}
        cursor = SimpleNamespace(to_list=AsyncMock(return_value=[row]))
        self.app.state.database = SimpleNamespace(contributions=SimpleNamespace(aggregate=AsyncMock(return_value=cursor)))
        response = self.client.get("/api/v1/leaderboard")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["badge"], "Changemaker")
        self.assertEqual(response.json()[0]["rank"], 1)
        self.assertNotIn("email", response.json()[0])
        self.assertEqual(self.client.get("/api/v1/leaderboard?limit=101").status_code, 422)


if __name__ == "__main__":
    unittest.main()
