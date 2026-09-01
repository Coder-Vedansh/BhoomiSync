import json
import asyncio
from typing import List, Dict, Set, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.models.drone_ingestion.models import Drone, DroneMission, MissionStatus
from app.modules.drone_ingestion.schemas.ingestion_schemas import (
    DroneResponse,
    DroneMissionCreateRequest,
    DroneMissionResponse,
    UploadUrlRequest,
    UploadUrlResponse,
    UploadCompleteRequest,
    UploadCompleteResponse,
    TelemetryIngestRequest,
    TelemetryRecordResponse,
    MissionHealthResponse,
    SimulatorStartRequest,
    SimulatorStatusResponse,
)
from app.modules.drone_ingestion.services.ingestion_service import IngestionService
from app.modules.drone_ingestion.services.processing_trigger_service import ProcessingTriggerService
from app.modules.drone_ingestion.simulator.drone_simulator import DroneSimulator
from app.modules.drone_ingestion.workers.processing_worker import ProcessingWorker

router = APIRouter(prefix="", tags=["Drone Data Ingestion & Cloud Processing"])


# ---------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------
class MissionConnectionManager:
    """Manages active WebSocket client connections for real-time mission monitoring."""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, mission_id: str, websocket: WebSocket):
        await websocket.accept()
        if mission_id not in self.active_connections:
            self.active_connections[mission_id] = set()
        self.active_connections[mission_id].add(websocket)

    def disconnect(self, mission_id: str, websocket: WebSocket):
        if mission_id in self.active_connections:
            self.active_connections[mission_id].discard(websocket)
            if not self.active_connections[mission_id]:
                del self.active_connections[mission_id]

    async def broadcast_to_mission(self, mission_id: str, message: dict):
        if mission_id in self.active_connections:
            dead_sockets = set()
            for connection in list(self.active_connections[mission_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.active_connections[mission_id].discard(dead)

    def safe_broadcast(self, mission_id: str, message: dict):
        """Dispatches WebSocket broadcast if an asyncio loop is active; fails gracefully otherwise."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast_to_mission(mission_id, message))
        except RuntimeError:
            pass


ws_manager = MissionConnectionManager()


# ---------------------------------------------------------
# Drone Hardware Registry Endpoints
# ---------------------------------------------------------
@router.get("/drones", response_model=List[DroneResponse])
def list_drones(db: Session = Depends(get_db)):
    """Lists registered drone survey hardware."""
    drones = db.query(Drone).all()
    if not drones:
        # Seed default drone if empty
        d1 = IngestionService.get_or_create_drone(db, "DRONE-001", "BhoomiSky Matrice 350 RTK")
        return [d1]
    return drones


# ---------------------------------------------------------
# Mission Lifecycle Endpoints
# ---------------------------------------------------------
@router.post("/missions", response_model=DroneMissionResponse, status_code=status.HTTP_201_CREATED)
def create_mission(req: DroneMissionCreateRequest, db: Session = Depends(get_db)):
    """Initializes a new drone flight mission and prepares 11-stage processing queue."""
    mission = IngestionService.create_mission(db, req)
    return mission


@router.get("/missions", response_model=List[DroneMissionResponse])
def list_missions(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Lists all drone survey missions with telemetry and stage progress."""
    return IngestionService.list_missions(db, skip=skip, limit=limit)


@router.get("/missions/{mission_id}", response_model=DroneMissionResponse)
def get_mission_detail(mission_id: str, db: Session = Depends(get_db)):
    """Retrieves full mission status, uploaded objects, and 11-stage progress."""
    mission = IngestionService.get_mission(db, mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found.")
    return mission


@router.post("/missions/{mission_id}/start", response_model=DroneMissionResponse)
def start_mission(mission_id: str, db: Session = Depends(get_db)):
    """Activates an initialized survey flight mission."""
    try:
        mission = IngestionService.update_mission_status(db, mission_id, MissionStatus.ACTIVE)
        ws_manager.safe_broadcast(mission_id, {
            "type": "MISSION_STATUS",
            "mission_id": mission_id,
            "status": mission.status.value,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        return mission
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/missions/{mission_id}/stop", response_model=DroneMissionResponse)
def stop_mission(mission_id: str, db: Session = Depends(get_db)):
    """Stops/completes an active mission and commits survey manifest."""
    try:
        mission = IngestionService.update_mission_status(db, mission_id, MissionStatus.COMPLETED)
        ws_manager.safe_broadcast(mission_id, {
            "type": "MISSION_STATUS",
            "mission_id": mission_id,
            "status": mission.status.value,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        return mission
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/missions/{mission_id}/pause", response_model=DroneMissionResponse)
def pause_mission(mission_id: str, db: Session = Depends(get_db)):
    """Pauses an active mission (e.g. battery swap or weather pause)."""
    try:
        mission = IngestionService.update_mission_status(db, mission_id, MissionStatus.INITIALIZED)
        ws_manager.safe_broadcast(mission_id, {
            "type": "MISSION_STATUS",
            "mission_id": mission_id,
            "status": "PAUSED",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        return mission
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/missions/{mission_id}/resume", response_model=DroneMissionResponse)
def resume_mission(mission_id: str, db: Session = Depends(get_db)):
    """Resumes a paused mission."""
    try:
        mission = IngestionService.update_mission_status(db, mission_id, MissionStatus.ACTIVE)
        ws_manager.safe_broadcast(mission_id, {
            "type": "MISSION_STATUS",
            "mission_id": mission_id,
            "status": mission.status.value,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        return mission
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/missions/{mission_id}/end", response_model=DroneMissionResponse)
def end_mission(mission_id: str, db: Session = Depends(get_db)):
    """Formally ends flight operations and initiates survey reconciliation."""
    return stop_mission(mission_id=mission_id, db=db)


@router.post("/missions/{mission_id}/cancel", response_model=DroneMissionResponse)
def cancel_mission(mission_id: str, db: Session = Depends(get_db)):
    """Cancels a mission."""
    try:
        mission = IngestionService.update_mission_status(db, mission_id, MissionStatus.CANCELLED)
        ws_manager.safe_broadcast(mission_id, {
            "type": "MISSION_STATUS",
            "mission_id": mission_id,
            "status": mission.status.value,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
        return mission
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



# ---------------------------------------------------------
# Presigned R2 Upload & Completion Endpoints
# ---------------------------------------------------------
@router.post("/upload-url", response_model=UploadUrlResponse)
def get_presigned_upload_url(req: UploadUrlRequest, db: Session = Depends(get_db)):
    """Generates a secure presigned HTTP PUT URL for direct edge-to-R2 upload."""
    try:
        return IngestionService.generate_upload_url(db, req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload-complete", response_model=UploadCompleteResponse)
def complete_sensor_upload(req: UploadCompleteRequest, db: Session = Depends(get_db)):
    """
    Idempotent upload completion handler.
    Validates SHA-256 digest, checks duplicates, and indexes object in R2 registry.
    """
    try:
        resp = IngestionService.complete_upload(db, req)
        
        # Broadcast upload event over WebSocket
        ws_manager.safe_broadcast(req.mission_id, {
            "type": "UPLOAD_EVENT",
            "sensor_type": req.sensor_type.value,
            "object_key": req.object_key,
            "size_bytes": req.size_bytes,
            "sequence_number": req.sequence_number,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })

        return resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# Telemetry Streaming Endpoints
# ---------------------------------------------------------
@router.post("/telemetry", response_model=TelemetryRecordResponse)
def ingest_telemetry_point(req: TelemetryIngestRequest, db: Session = Depends(get_db)):
    """
    Ingests high-frequency drone flight telemetry point and broadcasts over WebSocket.
    """
    try:
        record = IngestionService.ingest_telemetry(db, req)

        # Broadcast telemetry over WebSocket
        ws_manager.safe_broadcast(req.mission_id, {
            "type": "TELEMETRY",
            "mission_id": req.mission_id,
            "latitude": req.latitude,
            "longitude": req.longitude,
            "altitude": req.altitude,
            "heading": req.heading,
            "speed": req.speed,
            "battery_percent": req.battery_percent,
            "rtk_status": req.rtk_status,
            "satellites": req.satellites,
            "sequence_number": req.sequence_number,
            "timestamp": req.timestamp.isoformat() + "Z",
        })

        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/missions/{mission_id}/telemetry", response_model=List[TelemetryRecordResponse])
def get_mission_telemetry(mission_id: str, limit: int = Query(500, le=2000), db: Session = Depends(get_db)):
    """Returns chronological flight trajectory coordinates for GIS map rendering."""
    return IngestionService.get_mission_telemetry(db, mission_id, limit=limit)


# ---------------------------------------------------------
# Health & Observability Endpoint
# ---------------------------------------------------------
@router.get("/missions/{mission_id}/health", response_model=MissionHealthResponse)
def get_mission_health(mission_id: str, db: Session = Depends(get_db)):
    """Returns real-time mission telemetry latency, upload rate mbps, and pipeline queue status."""
    try:
        return IngestionService.get_mission_health(db, mission_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------
# Downstream Processing Trigger
# ---------------------------------------------------------
@router.post("/missions/{mission_id}/trigger-processing")
async def trigger_processing(mission_id: str, db: Session = Depends(get_db)):
    """Triggers the 11-stage processing pipeline for an ingested mission."""
    mission = IngestionService.get_mission(db, mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission '{mission_id}' not found.")

    asyncio.create_task(ProcessingWorker.process_mission_async(mission_id))
    return {"message": "Processing pipeline initiated.", "mission_id": mission_id, "stages": 11}



# ---------------------------------------------------------
# Drone Flight Simulator Endpoints
# ---------------------------------------------------------
@router.post("/simulator/start", response_model=SimulatorStatusResponse)
def start_simulator(req: SimulatorStartRequest):
    """Launches the background Drone Flight Simulator generating realistic telemetry & R2 uploads."""
    sim = DroneSimulator.get_instance()
    status_dict = sim.start(
        survey_id=req.survey_id,
        drone_id=req.drone_id,
        mission_id=req.mission_id,
        total_frames=req.total_frames,
        speed_factor=req.speed_factor,
        include_lidar=req.include_lidar,
        include_rgb=req.include_rgb,
    )
    return SimulatorStatusResponse(**status_dict)


@router.post("/simulator/stop", response_model=SimulatorStatusResponse)
def stop_simulator():
    """Stops the active flight simulator."""
    sim = DroneSimulator.get_instance()
    status_dict = sim.stop()
    return SimulatorStatusResponse(**status_dict)


@router.get("/simulator/status", response_model=SimulatorStatusResponse)
def get_simulator_status():
    """Retrieves current flight simulator status and drone coordinates."""
    sim = DroneSimulator.get_instance()
    return SimulatorStatusResponse(**sim.get_status())


# ---------------------------------------------------------
# WebSocket Real-Time Stream Endpoint
# ---------------------------------------------------------
@router.websocket("/ws/missions/{mission_id}")
async def mission_websocket(websocket: WebSocket, mission_id: str):
    """
    Live bidirectional WebSocket connection for mission telemetry, upload counters, and pipeline stages.
    """
    await ws_manager.connect(mission_id, websocket)
    try:
        # Send initial connection acknowledgment
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "mission_id": mission_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })

        while True:
            data = await websocket.receive_text()
            # Echo or handle incoming heartbeat ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(mission_id, websocket)
    except Exception:
        ws_manager.disconnect(mission_id, websocket)
