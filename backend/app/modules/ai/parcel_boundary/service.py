import uuid
from typing import Dict, Any
from app.modules.ai.parcel_boundary.model.base import StubParcelBoundaryDetectorModel
from app.modules.ai.parcel_boundary.schemas import (
    ParcelBoundaryJobRequest,
    ParcelBoundaryJobResponse
)


class ParcelBoundaryService:
    def __init__(self):
        self.model = StubParcelBoundaryDetectorModel()

    def get_info(self) -> Dict[str, Any]:
        return self.model.get_model_info()

    def run_detection(self, request: ParcelBoundaryJobRequest) -> ParcelBoundaryJobResponse:
        res = self.model.detect_parcel_boundaries(
            orthomosaic_key=request.dataset_id,
            min_parcel_area_m2=request.min_parcel_area_m2,
            simplification_tolerance_m=request.simplification_tolerance_m
        )
        return ParcelBoundaryJobResponse(
            job_id=f"JOB-PBD-{uuid.uuid4().hex[:8].upper()}",
            survey_id=request.survey_id,
            dataset_id=request.dataset_id,
            model_name="SAM-Cadastral-Boundary-V2",
            status="COMPLETED",
            parcels_detected_count=res["parcels_detected_count"],
            average_confidence=res["average_boundary_confidence"],
            output_dataset_id=f"DS-{request.survey_id}-AI-PRC"
        )
