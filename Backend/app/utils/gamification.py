from pymongo.errors import DuplicateKeyError

from app.utils.helpers import now
from app.utils.notify import create_notification

POINTS_PER_HOUR = 10
REFERRAL_POINTS = 25


def calculate_attendance_points(hours: float) -> int:
    return int(round(hours * POINTS_PER_HOUR))


def calculate_donation_points(donation: dict) -> int:
    if donation["type"] == "money":
        return min(int(donation.get("amount") or 0) // 100, 50)
    return min(int(donation.get("quantity") or 0) * 2, 30)


def award_points(db, user_id, points, kind, description, source_key, organization_id=None):

    if points <= 0:
        return False
    try:
        db.points_ledger.insert_one(
            {
                "user_id": user_id,
                "points": points,
                "kind": kind, 
                "description": description,
                "source_key": source_key,
                "organization_id": organization_id,
                "created_at": now(),
            }
        )
    except DuplicateKeyError:
        return False

    create_notification(
        db, user_id, "points", f"You earned {points} points", description, link="/app/badges"
    )
    return True


def get_volunteer_stats(db, user_id) -> dict:

    attendance = list(db.attendance.find({"volunteer_id": user_id}))
    category_counts = {}
    for record in attendance:
        category = record.get("category", "Other")
        category_counts[category] = category_counts.get(category, 0) + 1

    ledger = list(db.points_ledger.find({"user_id": user_id}))

    return {
        "total_hours": round(sum(record["hours"] for record in attendance), 2),
        "events_attended": len(attendance),
        "category_counts": category_counts,
        "verified_donations": db.donations.count_documents(
            {"donor_id": user_id, "status": "verified"}
        ),
        "referrals": len([entry for entry in ledger if entry["kind"] == "referral"]),
        "points": sum(entry["points"] for entry in ledger),
    }


def badge_progress(badge: dict, stats: dict) -> float:
    rule = badge["rule_type"]
    if rule == "hours":
        return stats["total_hours"]
    if rule == "events":
        return stats["events_attended"]
    if rule == "category_events":
        wanted = [c.lower() for c in badge.get("categories", [])]
        return sum(
            count for category, count in stats["category_counts"].items()
            if category.lower() in wanted
        )
    if rule == "donations":
        return stats["verified_donations"]
    if rule == "referrals":
        return stats["referrals"]
    if rule == "points":
        return stats["points"]
    return 0


def check_and_award_badges(db, user_id) -> list:
    stats = get_volunteer_stats(db, user_id)
    earned_ids = {b["badge_id"] for b in db.user_badges.find({"user_id": user_id})}
    new_badges = []

    for badge in db.badges.find():
        if badge["_id"] in earned_ids:
            continue
        if badge_progress(badge, stats) >= badge["threshold"]:
            try:
                db.user_badges.insert_one(
                    {"user_id": user_id, "badge_id": badge["_id"], "earned_at": now()}
                )
            except DuplicateKeyError:
                continue
            new_badges.append(badge)
            create_notification(
                db,
                user_id,
                "achievement",
                f'New badge: {badge["name"]} {badge.get("icon", "")}'.strip(),
                badge["description"],
                link="/app/badges",
            )
    return new_badges


def get_user_badges(db, user_id) -> list:
    result = []
    for earned in db.user_badges.find({"user_id": user_id}).sort("earned_at", -1):
        badge = db.badges.find_one({"_id": earned["badge_id"]})
        if badge:
            result.append(
                {
                    "id": str(badge["_id"]),
                    "code": badge["code"],
                    "title": badge["name"],
                    "icon": badge.get("icon", ""),
                    "description": badge["description"],
                    "earned_at": earned["earned_at"],
                }
            )
    return result
