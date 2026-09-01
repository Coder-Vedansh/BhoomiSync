import os
import time
import math
import hashlib
import threading
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.drone_ingestion.models import (
    MissionStatus,
    SensorDataType,
    DroneStatus,
    JobStageStatus,
)
from app.modules.drone_ingestion.schemas.ingestion_schemas import (
    DroneMissionCreateRequest,
    UploadUrlRequest,
    UploadCompleteRequest,
    TelemetryIngestRequest,
)
from app.modules.drone_ingestion.services.ingestion_service import IngestionService
from app.modules.drone_ingestion.services.r2_storage_service import R2StorageService
from app.modules.drone_ingestion.services.processing_trigger_service import ProcessingTriggerService


class DroneSimulator:
    """
    High-Fidelity Drone Hardware & Flight Computer Simulator.
    Simulates cellular 4G/5G streaming of RGB frames, LiDAR scans, RTK GNSS, IMU telemetry,
    disconnection/reconnection, and automated cloud processing triggers.
    """

    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.mission_id: Optional[str] = None
        self.survey_id: str = "SURVEY-2026-001"
        self.drone_id: str = "DRONE-001"
        
        # Flight state
        self.frames_sent = 0
        self.total_frames = 30
        self.speed_factor = 1.0
        self.current_lat = 24.5853
        self.current_lon = 73.7132
        self.current_alt = 120.0
        self.current_heading = 90.0
        self.battery = 100.0
        self.status = "IDLE"

    @classmethod
    def get_instance(cls) -> "DroneSimulator":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "mission_id": self.mission_id,
            "survey_id": self.survey_id,
            "drone_id": self.drone_id,
            "frames_sent": self.frames_sent,
            "total_frames": self.total_frames,
            "current_lat": round(self.current_lat, 6),
            "current_lon": round(self.current_lon, 6),
            "current_alt": round(self.current_alt, 1),
            "current_heading": round(self.current_heading, 1),
            "battery": round(self.battery, 1),
            "status": self.status,
        }

    def start(
        self,
        survey_id: str = "SURVEY-2026-001",
        drone_id: str = "DRONE-001",
        mission_id: Optional[str] = None,
        total_frames: int = 30,
        speed_factor: float = 1.0,
        include_lidar: bool = True,
        include_rgb: bool = True,
    ) -> Dict[str, Any]:
        with self._lock:
            if self.is_running:
                return self.get_status()

            self.survey_id = survey_id
            self.drone_id = drone_id
            self.total_frames = total_frames
            self.speed_factor = speed_factor
            self.frames_sent = 0
            self.battery = 100.0
            self.is_running = True
            self.status = "CONNECTING"

            db: Session = SessionLocal()
            try:
                if not mission_id:
                    # Create a new mission
                    req = DroneMissionCreateRequest(
                        drone_id=drone_id,
                        mission_name=f"Haripura Real-Time Aerial Survey ({datetime.utcnow().strftime('%H:%M')})",
                        survey_id=survey_id,
                    )
                    mission = IngestionService.create_mission(db, req)
                    self.mission_id = mission.mission_id
                else:
                    self.mission_id = mission_id

                # Activate mission
                IngestionService.update_mission_status(db, self.mission_id, MissionStatus.ACTIVE)
            finally:
                db.close()

            self.thread = threading.Thread(
                target=self._run_simulation_loop,
                args=(include_lidar, include_rgb),
                daemon=True,
            )
            self.thread.start()

            return self.get_status()

    def stop(self) -> Dict[str, Any]:
        with self._lock:
            self.is_running = False
            self.status = "STOPPED"
            return self.get_status()

    def _run_simulation_loop(self, include_lidar: bool, include_rgb: bool):
        """Simulation execution thread."""
        base_lat = 24.5830
        base_lon = 73.7120
        grid_rows = 5
        cols_per_row = max(1, self.total_frames // grid_rows)
        lat_step = 0.0004
        lon_step = 0.0005

        self.status = "TRANSMITTING"

        for i in range(self.total_frames):
            if not self.is_running:
                break

            # Calculate lawnmower trajectory coordinates
            row = i // cols_per_row
            col = i % cols_per_row
            direction = 1 if row % 2 == 0 else -1
            actual_col = col if direction == 1 else (cols_per_row - 1 - col)

            self.current_lat = base_lat + (row * lat_step) + (math.sin(i * 0.2) * 0.00005)
            self.current_lon = base_lon + (actual_col * lon_step)
            self.current_alt = 120.0 + (math.cos(i * 0.3) * 2.5)
            self.current_heading = 90.0 if direction == 1 else 270.0
            self.battery = max(15.0, 100.0 - (i * (80.0 / self.total_frames)))

            db: Session = SessionLocal()
            try:
                # 1. Stream GNSS/RTK Telemetry
                tel_req = TelemetryIngestRequest(
                    mission_id=self.mission_id,
                    timestamp=datetime.utcnow(),
                    latitude=self.current_lat,
                    longitude=self.current_lon,
                    altitude=self.current_alt,
                    heading=self.current_heading,
                    pitch=-2.1 + (math.sin(i) * 0.5),
                    roll=0.8 + (math.cos(i) * 0.3),
                    rtk_status="FIXED_RTK" if i % 15 != 7 else "FLOAT_RTK",
                    satellites=18 if i % 15 != 7 else 12,
                    hdop=0.75,
                    speed=9.2,
                    battery_percent=self.battery,
                    sequence_number=i + 1,
                )
                IngestionService.ingest_telemetry(db, tel_req)

                # 2. Upload Synthetic RGB Image
                if include_rgb:
                    rgb_filename = f"frame_{i+1:06d}.jpg"
                    rgb_bytes = f"BHOOMISYNC_SIMULATED_RGB_RAW_IMAGE_PAYLOAD_FRAME_{i+1}_{datetime.utcnow().isoformat()}".encode("utf-8") * 64
                    rgb_sha256 = hashlib.sha256(rgb_bytes).hexdigest()
                    
                    url_req = UploadUrlRequest(
                        mission_id=self.mission_id,
                        sensor_type=SensorDataType.RGB,
                        filename=rgb_filename,
                        content_type="image/jpeg",
                    )
                    url_resp = IngestionService.generate_upload_url(db, url_req)
                    
                    # Direct upload to storage
                    R2StorageService.put_object_direct(
                        object_key=url_resp.object_key,
                        data=rgb_bytes,
                        content_type="image/jpeg",
                    )

                    # Complete upload
                    comp_req = UploadCompleteRequest(
                        mission_id=self.mission_id,
                        object_key=url_resp.object_key,
                        sensor_type=SensorDataType.RGB,
                        size_bytes=len(rgb_bytes),
                        sha256=rgb_sha256,
                        sequence_number=i + 1,
                    )
                    IngestionService.complete_upload(db, comp_req)

                # 3. Upload Synthetic LiDAR chunk periodically
                if include_lidar and (i % 3 == 0):
                    lidar_seq = (i // 3) + 1
                    lidar_filename = f"scan_chunk_{lidar_seq:04d}.las"
                    lidar_bytes = f"BHOOMISYNC_SIMULATED_LIDAR_POINT_CLOUD_CHUNK_{lidar_seq}".encode("utf-8") * 128
                    lidar_sha256 = hashlib.sha256(lidar_bytes).hexdigest()

                    l_url_req = UploadUrlRequest(
                        mission_id=self.mission_id,
                        sensor_type=SensorDataType.LIDAR,
                        filename=lidar_filename,
                        content_type="application/octet-stream",
                    )
                    l_url_resp = IngestionService.generate_upload_url(db, l_url_req)
                    
                    R2StorageService.put_object_direct(
                        object_key=l_url_resp.object_key,
                        data=lidar_bytes,
                        content_type="application/octet-stream",
                    )

                    l_comp_req = UploadCompleteRequest(
                        mission_id=self.mission_id,
                        object_key=l_url_resp.object_key,
                        sensor_type=SensorDataType.LIDAR,
                        size_bytes=len(lidar_bytes),
                        sha256=lidar_sha256,
                        sequence_number=lidar_seq,
                    )
                    IngestionService.complete_upload(db, l_comp_req)

            except Exception as e:
                print(f"[Simulator] Error in iteration {i}: {e}")
            finally:
                db.close()

            self.frames_sent = i + 1
            time.sleep(max(0.05, 0.4 / self.speed_factor))

        # Complete mission and trigger downstream processing
        if self.is_running:
            self.status = "PROCESSING"
            db = SessionLocal()
            try:
                IngestionService.update_mission_status(db, self.mission_id, MissionStatus.PROCESSING)
                
                # Advance the 11 stages
                for stage_num in range(1, 12):
                    ProcessingTriggerService.advance_stage(
                        db=db,
                        mission_id=self.mission_id,
                        stage_number=stage_num,
                        progress=100.0,
                        status=JobStageStatus.COMPLETED,
                    )
                    time.sleep(0.15)

                IngestionService.update_mission_status(db, self.mission_id, MissionStatus.COMPLETED)
                self.status = "COMPLETED"
            except Exception as e:
                print(f"[Simulator] Error finishing mission: {e}")
            finally:
                db.close()

        self.is_running = False
