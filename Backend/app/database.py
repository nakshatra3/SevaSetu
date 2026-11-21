from pymongo import ASCENDING, DESCENDING, MongoClient

from app.config import settings

client = None
db = None


def connect_to_mongo():
    """Connect to MongoDB, check the connection, and create indexes."""
    global client, db
    client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")  # fails fast with a clear error if MongoDB is not running
    db = client[settings.MONGODB_DATABASE]
    setup_database(db)


def close_mongo():
    if client is not None:
        client.close()


def get_db():
    if db is None:
        raise RuntimeError("Database is not connected. Is MongoDB running?")
    return db


def setup_database(database):
    """Create indexes and insert default categories/badges (safe to run many times)."""
    create_indexes(database)

    # Imported here to avoid a circular import (utils use get_db()).
    from app.utils.defaults import ensure_default_data

    ensure_default_data(database)


def create_indexes(database):
    # Unique indexes are our main protection against duplicates.
    database.users.create_index("email", unique=True, name="unique_user_email")
    database.users.create_index("referral_code", unique=True, sparse=True)
    database.volunteer_profiles.create_index("user_id", unique=True)
    database.organizations.create_index("user_id", unique=True)

    database.events.create_index([("start_time", ASCENDING)])
    database.events.create_index("organization_id")


    database.registrations.create_index(
        [("event_id", ASCENDING), ("volunteer_id", ASCENDING)], unique=True
    )
    database.attendance.create_index(
        [("event_id", ASCENDING), ("volunteer_id", ASCENDING)], unique=True
    )

    database.points_ledger.create_index("source_key", unique=True)
    database.points_ledger.create_index("user_id")
    database.user_badges.create_index(
        [("user_id", ASCENDING), ("badge_id", ASCENDING)], unique=True
    )
    database.badges.create_index("code", unique=True)
    database.categories.create_index("name", unique=True)

    database.reviews.create_index(
        [("reviewer_id", ASCENDING), ("organization_id", ASCENDING), ("event_id", ASCENDING)],
        unique=True,
    )
    database.notifications.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    database.notifications.create_index("dedupe_key", unique=True, sparse=True)
