
from pymongo import AsyncMongoClient

from app.config import settings


client = AsyncMongoClient(settings.MONGODB_URI)
database = client[settings.MONGODB_DATABASE]


async def connect_database():
    await client.admin.command("ping")

    await database.users.create_index(
        "email",
        unique=True,
        name="unique_user_email",
    )


async def close_database():
    await client.close()
