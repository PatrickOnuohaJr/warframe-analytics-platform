import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .db import engine
from .routers import warframes, weapons, mods, arcanes, builds

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# App
app = FastAPI(
    title="Warframe Analytics API",
    description=(
        "REST API exposing Warframe base-game data (frames, weapons, mods, arcanes) "
        "and user build records stored in SQL Server."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Routers
app.include_router(warframes.router)
app.include_router(weapons.router)
app.include_router(mods.router)
app.include_router(arcanes.router)
app.include_router(builds.router)

# Root
@app.get("/", tags=["Meta"])
def read_root():
    return {
        "service": "Warframe Analytics API",
        "version": "1.0.0",
        "docs": "/docs",
    }

# Health
@app.get("/health", tags=["Meta"])
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        logger.warning(f"Health check DB ping failed: {exc}")
        db_status = "unreachable"

    return {"status": "ok", "database": db_status}