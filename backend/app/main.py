"""FastAPI application factory."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, orders, disputes, stats, settings, simulate, webhooks
from app.config import get_settings
from app.db import init_db


def create_app() -> FastAPI:
    cfg = get_settings()
    app = FastAPI(title="DisputeShield API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in cfg.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup():
        init_db()

    app.include_router(health.router)
    app.include_router(orders.router)
    app.include_router(disputes.router)
    app.include_router(stats.router)
    app.include_router(settings.router)
    app.include_router(simulate.router)
    app.include_router(webhooks.router)
    return app


app = create_app()
