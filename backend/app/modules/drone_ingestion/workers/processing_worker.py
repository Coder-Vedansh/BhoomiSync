import asyncio
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.drone_ingestion.models import JobStageStatus, MissionStatus
from app.modules.drone_ingestion.services.processing_trigger_service import ProcessingTriggerService
from app.modules.drone_ingestion.services.ingestion_service import IngestionService


class ProcessingWorker:
    """
    Asynchronous Background Job Worker for Multi-Stage Pipeline Execution.
    Runs pipeline stages sequentially with live status updates.
    """

    @classmethod
    async def process_mission_async(cls, mission_id: str, delay_seconds: float = 0.2):
        """Asynchronously executes the 11-stage pipeline for a mission."""
        db: Session = SessionLocal()
        try:
            IngestionService.update_mission_status(db, mission_id, MissionStatus.PROCESSING)

            for stage_num in range(1, 12):
                # Start stage
                ProcessingTriggerService.advance_stage(
                    db=db,
                    mission_id=mission_id,
                    stage_number=stage_num,
                    progress=25.0,
                    status=JobStageStatus.RUNNING,
                )
                await asyncio.sleep(delay_seconds / 2)

                # Mid-stage
                ProcessingTriggerService.advance_stage(
                    db=db,
                    mission_id=mission_id,
                    stage_number=stage_num,
                    progress=75.0,
                    status=JobStageStatus.RUNNING,
                )
                await asyncio.sleep(delay_seconds / 2)

                # Complete stage
                ProcessingTriggerService.advance_stage(
                    db=db,
                    mission_id=mission_id,
                    stage_number=stage_num,
                    progress=100.0,
                    status=JobStageStatus.COMPLETED,
                )

            IngestionService.update_mission_status(db, mission_id, MissionStatus.COMPLETED)
        finally:
            db.close()
