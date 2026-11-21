"""Default categories and badges.

Inserted automatically when the app starts (only if they don't exist yet),
so the platform works even before you run the seed script.
Admins can add/remove categories and badges later from the admin dashboard.
"""

from app.utils.helpers import now

DEFAULT_CATEGORIES = [
    "Teaching",
    "Cleaning",
    "Plantation",
    "Food Distribution",
    "Healthcare",
    "Animal Welfare",
    "Elderly Care",
    "Other",
]

# rule_type decides how a badge is earned:
#   events          -> number of verified activities
#   hours           -> verified volunteering hours
#   category_events -> verified activities in the listed categories
#   donations       -> verified donations
#   referrals       -> recruited volunteers who completed an activity
#   points          -> total points
DEFAULT_BADGES = [
    {
        "code": "first-step",
        "name": "First Step",
        "description": "Complete your first verified volunteering activity.",
        "icon": "🌱",
        "rule_type": "events",
        "threshold": 1,
        "categories": [],
    },
    {
        "code": "green-warrior",
        "name": "Green Warrior",
        "description": "Attend 3 plantation or cleaning activities.",
        "icon": "🌳",
        "rule_type": "category_events",
        "threshold": 3,
        "categories": ["Plantation", "Cleaning"],
    },
    {
        "code": "community-hero",
        "name": "Community Hero",
        "description": "Attend 10 verified volunteering activities.",
        "icon": "🦸",
        "rule_type": "events",
        "threshold": 10,
        "categories": [],
    },
    {
        "code": "hundred-hours",
        "name": "100-Hour Volunteer",
        "description": "Give 100 verified volunteering hours.",
        "icon": "💯",
        "rule_type": "hours",
        "threshold": 100,
        "categories": [],
    },
    {
        "code": "generous-giver",
        "name": "Generous Giver",
        "description": "Make 3 donations that the organization verified.",
        "icon": "🎁",
        "rule_type": "donations",
        "threshold": 3,
        "categories": [],
    },
    {
        "code": "team-builder",
        "name": "Team Builder",
        "description": "Recruit 3 volunteers who complete their first activity.",
        "icon": "🤝",
        "rule_type": "referrals",
        "threshold": 3,
        "categories": [],
    },
]


def ensure_default_data(db):
    # Only fill in defaults when the collection is empty, so admin changes are kept.
    if db.categories.count_documents({}) == 0:
        db.categories.insert_many(
            [{"name": name, "created_at": now()} for name in DEFAULT_CATEGORIES]
        )

    if db.badges.count_documents({}) == 0:
        db.badges.insert_many([{**badge, "created_at": now()} for badge in DEFAULT_BADGES])
