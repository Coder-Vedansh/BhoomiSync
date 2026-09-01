import uuid
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.drone_ingestion.models import (
    DroneMission,
    ProcessingJobStage,
    JobStageStatus,
    MissionStatus,
)
from app.core.config import settings


class ProcessingTriggerService:
    """
    Downstream Processing Orchestration Service.
    Coordinates Prompts 2-3-4-5-7 pipelines across the 11 defined processing stages.
    """

    STAGE_DEFINITIONS = [
        (1, "Raw Sensor Integrity & Checksum Verification"),
        (2, "RTK/GNSS Trajectory Georeferencing"),
        (3, "Structure-from-Motion (SfM) Photogrammetry"),
        (4, "Dense Point Cloud & LiDAR Fusion"),
        (5, "Orthomosaic Map Raster Generation"),
        (6, "Digital Elevation (DEM/DSM) Surface Mesh"),
        (7, "Accurate 3D Geodesic Area Measurement"),
        (8, "AI Land-Use & Land-Cover (LULC) Classification"),
        (9, "AI Automated Boundary Intelligence Extraction"),
        (10, "Cadastral Historical Alignment & Encroachment Anomaly"),
        (11, "Digital Survey Report & Multi-Format Export Generation"),
    ]

    @classmethod
    def initialize_mission_stages(cls, db: Session, mission_id: str) -> List[ProcessingJobStage]:
        """Creates the 11 initial processing stage records for a mission if not already present."""
        existing = db.query(ProcessingJobStage).filter(ProcessingJobStage.mission_id == mission_id).all()
        if existing:
            return existing

        job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
        stages = []
        for num, name in cls.STAGE_DEFINITIONS:
            stage = ProcessingJobStage(
                job_id=job_id,
                mission_id=mission_id,
                stage_number=num,
                stage_name=name,
                status=JobStageStatus.QUEUED,
                progress=0.0,
            )
            db.add(stage)
            stages.append(stage)

        db.commit()
        return stages

    @classmethod
    def advance_stage(
        cls,
        db: Session,
        mission_id: str,
        stage_number: int,
        progress: float = 100.0,
        status: JobStageStatus = JobStageStatus.COMPLETED,
        error_message: Optional[str] = None,
    ) -> Optional[ProcessingJobStage]:
        """Updates the status and progress of a specific processing stage."""
        stage = db.query(ProcessingJobStage).filter(
            ProcessingJobStage.mission_id == mission_id,
            ProcessingJobStage.stage_number == stage_number,
        ).first()

        if stage:
            stage.progress = progress
            stage.status = status
            if status == JobStageStatus.RUNNING and not stage.started_at:
                stage.started_at = datetime.utcnow()
            elif status in [JobStageStatus.COMPLETED, JobStageStatus.FAILED]:
                stage.completed_at = datetime.utcnow()
            if error_message:
                stage.error_message = error_message
            db.commit()
            db.refresh(stage)

        return stage

    @classmethod
    def run_pipeline_sync(cls, db: Session, mission_id: str) -> Dict[str, Any]:
        """
        Executes or simulates complete 11-stage pipeline synchronously (used for unit tests and local triggers).
        """
        stages = cls.initialize_mission_stages(db, mission_id)
        mission = db.query(DroneMission).filter(DroneMission.mission_id == mission_id).first()
        if mission:
            mission.status = MissionStatus.PROCESSING
            db.commit()

        for s in stages:
            s.status = JobStageStatus.COMPLETED
            s.progress = 100.0
            s.started_at = datetime.utcnow()
            s.completed_at = datetime.utcnow()

        if mission:
            mission.status = MissionStatus.COMPLETED
            mission.ended_at = datetime.utcnow()
            mission.processed_objects = mission.total_objects

        db.commit()

        return {
            "mission_id": mission_id,
            "status": "COMPLETED",
            "total_stages": len(stages),
            "completed_stages": len(stages),
        }
