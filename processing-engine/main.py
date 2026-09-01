"""
BhoomiSync Photogrammetry & AI Processing Engine
=================================================
Standalone FastAPI microservice for:
  - Drone image ingestion & storage
  - Photogrammetry pipeline (ODM / OpenSfM)
  - Orthomosaic / DEM / DSM / Point Cloud generation
  - AI: LULC Classification, Boundary Detection, Change Detection
  - Tile serving for rendered orthomosaics

To run:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 9000 --reload

API Base: http://<engine-host>:9000/api/v1/engine
Docs:     http://<engine-host>:9000/docs

Environment variables (set in .env):
  ENGINE_SECRET_KEY   — shared secret with BhoomiSync backend (Bearer token)
  STORAGE_PATH        — local path for uploaded images & outputs
  ODM_ENABLED         — "true" to use OpenDroneMap, "false" for simulation
  ODM_URL             — NodeODM endpoint e.g. http://localhost:3000
  REDIS_URL           — Redis for job queue (optional, falls back to in-memory)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import engine_router
from app.core.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="BhoomiSync Processing Engine",
    version="1.0.0",
    description=(
        "Standalone photogrammetry & AI processing microservice for BhoomiSync. "
        "Accepts drone images, runs the full pipeline, returns tile-ready outputs."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down to BhoomiSync backend IP in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(engine_router, prefix="/api/v1/engine")


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "BhoomiSync Processing Engine",
        "version": "1.0.0",
        "status": "ONLINE",
        "docs": "/docs",
        "health": "/api/v1/engine/health",
    }
