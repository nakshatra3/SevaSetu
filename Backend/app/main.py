
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.database import (
    database,
    connect_database,
    close_database,
)
from app.routes.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_database()
    app.state.database = database

    try:
        yield
    finally:
        await close_database()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(
    auth_router,
    prefix="/api/v1",
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
