from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.exceptions import BhoomiSyncException
from app.api.router import api_v1_router, api_compat_router
from app.db.session import init_db, SessionLocal
from app.db.seed import seed_mock_data


def _run_auto_migrations():
    """
    Run lightweight SQLite schema auto-migrations at startup.
    Ensures new columns added to SQLAlchemy models are present in the dev SQLite DB
    without requiring Alembic. Safe to run multiple times (idempotent).
    """
    from app.db.session import engine
    import sqlalchemy

    # Only needed for SQLite dev mode — PostgreSQL uses Alembic
    if "sqlite" not in str(engine.url):
        return

    migrations = [
        # (table, column, column_def)
        ("surveys", "lifecycle_stage", "TEXT DEFAULT 'PLANNED'"),
    ]

    with engine.connect() as conn:
        for table, column, col_def in migrations:
            try:
                result = conn.execute(sqlalchemy.text(f"PRAGMA table_info({table})"))
                existing_cols = [row[1] for row in result.fetchall()]
                if column not in existing_cols:
                    conn.execute(sqlalchemy.text(
                        f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"
                    ))
                    conn.commit()
            except Exception:
                pass  # Table may not exist yet on first run — init_db() will create it


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Initialize DB Schema
    init_db()
    # Run any pending schema migrations (idempotent)
    _run_auto_migrations()
    # Seed mock data
    db = SessionLocal()
    try:
        seed_mock_data(db)
    finally:
        db.close()
    yield



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="BhoomiSync: Rural Agricultural Land Survey, Resurvey, Mapping & GIS Platform Backend",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Centralized Error Handling
# ------------------------------------------------------------------------------

@app.exception_handler(BhoomiSyncException)
async def bhoomi_sync_exception_handler(request: Request, exc: BhoomiSyncException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join([str(l) for l in err.get("loc", [])])
        msg = err.get("msg", "Invalid field")
        error_messages.append(f"{loc}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "; ".join(error_messages) if error_messages else "Request validation failed.",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "details": str(exc) if settings.DEBUG else None
            }
        }
    )


# Mount Canonical API v1 and compatibility aliases
app.include_router(api_v1_router)
app.include_router(api_compat_router)

from app.modules.drone_ingestion.routers.drone_ingestion_router import ws_manager, WebSocket, WebSocketDisconnect

@app.websocket("/ws/missions/{mission_id}")
async def root_mission_websocket(websocket: WebSocket, mission_id: str):
    """Root WebSocket endpoint for real-time mission telemetry and cloud processing streams."""
    await ws_manager.connect(mission_id, websocket)
    try:
        from datetime import datetime
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "mission_id": mission_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(mission_id, websocket)
    except Exception:
        ws_manager.disconnect(mission_id, websocket)


@app.get("/", tags=["Root"])
def root():
    return {
        "platform": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "ONLINE",
        "documentation": "/docs",
        "v1_health": "/api/v1/health"
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
