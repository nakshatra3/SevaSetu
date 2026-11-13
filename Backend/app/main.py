from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import database
from app.config import settings
from app.routes import (
    auth,
    events,
    notifications,
    organizations,
    registrations,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if database.db is None:
        database.connect_to_mongo()
    yield
    database.close_mongo()


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in [
    auth,
    organizations,
    events,
    registrations,
    notifications,
]:
    app.include_router(module.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok"}
