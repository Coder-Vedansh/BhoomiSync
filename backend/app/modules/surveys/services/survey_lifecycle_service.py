import enum
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models.survey import Survey
from app.models.drone_ingestion.models import DroneMission, MissionStatus
from app.models.ingestion import ProcessingJob, JobStatus
from app.core.exceptions import NotFoundException, ValidationException
try:
    from app.modules.drone_ingestion.routers.drone_ingestion_router import ws_manager
except Exception:
    ws_manager = None


class SurveyLifecycleStage(str, enum.Enum):
    PLANNED = "PLANNED"
    MISSION_ACTIVE = "MISSION_ACTIVE"
    DATA_INGESTING = "DATA_INGESTING"
    PROCESSING = "PROCESSING"
    AI_ANALYSIS = "AI_ANALYSIS"
    CADASTRAL_RECONCILIATION = "CADASTRAL_RECONCILIATION"
    SURVEYOR_REVIEW = "SURVEYOR_REVIEW"
    APPROVED = "APPROVED"
    REPORT_PUBLISHED = "REPORT_PUBLISHED"
    ARCHIVED = "ARCHIVED"


LIFECYCLE_ORDER = [
    SurveyLifecycleStage.PLANNED,
    SurveyLifecycleStage.MISSION_ACTIVE,
    SurveyLifecycleStage.DATA_INGESTING,
    SurveyLifecycleStage.PROCESSING,
    SurveyLifecycleStage.AI_ANALYSIS,
    SurveyLifecycleStage.CADASTRAL_RECONCILIATION,
    SurveyLifecycleStage.SURVEYOR_REVIEW,
    SurveyLifecycleStage.APPROVED,
    SurveyLifecycleStage.REPORT_PUBLISHED,
    SurveyLifecycleStage.ARCHIVED,
]


class StageDetail(BaseModel):
    stage: str
    status: str  # "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    description: str


class SurveyLifecycleStatus(BaseModel):
    survey_id: str
    current_stage: str
    progress_percentage: int
    stages: List[StageDetail]
    active_mission_id: Optional[str] = None
    last_updated: str


class SurveyLifecycleService:
    """
    Central Coordinator for the 10-Stage Unified Survey Lifecycle.
    Synchronizes survey progress across physical missions, cloud R2 ingestion,
    processing jobs, AI models, land records, and report publication.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_survey_lifecycle(self, survey_id: str) -> SurveyLifecycleStatus:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey '{survey_id}' not found.")

        # Find linked active mission
        mission = self.db.query(DroneMission).filter(DroneMission.survey_id == survey_id).first()

        # Determine current stage based on survey, mission, and report state
        current_stage = SurveyLifecycleStage.PLANNED

        if hasattr(survey, "lifecycle_stage") and survey.lifecycle_stage:
            current_stage = SurveyLifecycleStage(survey.lifecycle_stage)
        else:
            # Infer current stage from existing artifacts
            if mission:
                if mission.status in (MissionStatus.ACTIVE, MissionStatus.RECEIVING_DATA):
                    current_stage = SurveyLifecycleStage.DATA_INGESTING
                elif mission.status == MissionStatus.PROCESSING:
                    current_stage = SurveyLifecycleStage.PROCESSING
                elif mission.status == MissionStatus.COMPLETED:
                    current_stage = SurveyLifecycleStage.SURVEYOR_REVIEW

        # Build Stage Details
        current_idx = LIFECYCLE_ORDER.index(current_stage) if current_stage in LIFECYCLE_ORDER else 0
        progress = int(((current_idx + 1) / len(LIFECYCLE_ORDER)) * 100)

        stage_descriptions = {
            SurveyLifecycleStage.PLANNED: "Survey campaign georeferenced and planned",
            SurveyLifecycleStage.MISSION_ACTIVE: "Drone mission active in flight",
            SurveyLifecycleStage.DATA_INGESTING: "Cellular 5G streaming sensor data to Cloudflare R2",
            SurveyLifecycleStage.PROCESSING: "11-Stage SfM photogrammetry & DEM generation",
            SurveyLifecycleStage.AI_ANALYSIS: "DeepLabV3+ LULC segmentation & SAM bund detection",
            SurveyLifecycleStage.CADASTRAL_RECONCILIATION: "4-Way area matrix comparison with Khatoni",
            SurveyLifecycleStage.SURVEYOR_REVIEW: "Surveyor human-in-the-loop boundary validation",
            SurveyLifecycleStage.APPROVED: "Surveyor certified and signed off",
            SurveyLifecycleStage.REPORT_PUBLISHED: "Authoritative Form 1-A PDF & GIS layers published",
            SurveyLifecycleStage.ARCHIVED: "Permanently sealed in digital cadastral archive",
        }

        stages = []
        for idx, stage in enumerate(LIFECYCLE_ORDER):
            if idx < current_idx:
                status = "COMPLETED"
            elif idx == current_idx:
                status = "IN_PROGRESS"
            else:
                status = "PENDING"

            stages.append(
                StageDetail(
                    stage=stage.value,
                    status=status,
                    description=stage_descriptions[stage],
                )
            )

        return SurveyLifecycleStatus(
            survey_id=survey_id,
            current_stage=current_stage.value,
            progress_percentage=progress,
            stages=stages,
            active_mission_id=mission.mission_id if mission else None,
            last_updated=datetime.utcnow().isoformat() + "Z",
        )

    async def transition_stage(
        self,
        survey_id: str,
        target_stage: SurveyLifecycleStage,
        actor_role: str = "SURVEYOR",
        comment: Optional[str] = None,
    ) -> SurveyLifecycleStatus:
        """Transitions survey to next lifecycle stage and broadcasts WebSocket event."""
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException(f"Survey '{survey_id}' not found.")

        # RBAC Check for sensitive approvals
        if target_stage in (SurveyLifecycleStage.APPROVED, SurveyLifecycleStage.REPORT_PUBLISHED):
            if actor_role not in ("SURVEYOR", "GOVERNMENT_OFFICIAL", "ADMIN"):
                raise ValidationException("Only certified surveyors or administrators can approve surveys.")

        # Update stage attribute on survey model
        survey.lifecycle_stage = target_stage.value
        survey.updated_at = datetime.utcnow()
        self.db.commit()

        # Broadcast WebSocket event
        event_payload = {
            "event_type": "SURVEY_LIFECYCLE_TRANSITION",
            "survey_id": survey_id,
            "target_stage": target_stage.value,
            "actor_role": actor_role,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        if ws_manager:
            try:
                ws_manager.safe_broadcast(survey_id, event_payload)
            except Exception:
                pass

        return self.get_survey_lifecycle(survey_id)
