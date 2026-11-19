from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import database
from app.config import settings
from app.routes import (
    admin,
    attendance,
    auth,
    categories,
    donations,
    events,
    gamification,
    leaderboards,
    notifications,
    organizations,
    recommendations,
    registrations,
    reports,
    reviews,
    volunteers,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tests put an in-memory database in `database.db` before starting the app.
    if database.db is None:
        database.connect_to_mongo()
    yield
    database.close_mongo()


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

# Lets the React app (on another port) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every router is available under /api/v1, e.g. /api/v1/events
for module in [
    auth,
    volunteers,
    organizations,
    events,
    categories,
    registrations,
    attendance,
    donations,
    reviews,
    notifications,
    reports,
    gamification,
    leaderboards,
    recommendations,
    admin,
]:
    app.include_router(module.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok"}
