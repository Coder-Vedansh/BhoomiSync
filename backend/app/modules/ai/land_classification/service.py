import uuid
from typing import Dict, Any
from app.modules.ai.land_classification.model.base import StubLandClassifierModel
from app.modules.ai.land_classification.schemas import (
    LandClassificationJobRequest,
    LandClassificationJobResponse
)


class LandClassificationService:
    def __init__(self):
        self.model = StubLandClassifierModel()

    def get_info(self) -> Dict[str, Any]:
        return self.model.get_model_info()

    def run_classification(self, request: LandClassificationJobRequest) -> LandClassificationJobResponse:
        inference_res = self.model.classify_orthomosaic(
            orthomosaic_key=request.dataset_id,
            classes=request.target_classes
        )
        return LandClassificationJobResponse(
            job_id=f"JOB-LC-{uuid.uuid4().hex[:8].upper()}",
            survey_id=request.survey_id,
            dataset_id=request.dataset_id,
            model_name="SegFormer-B3-Agri",
            status="COMPLETED",
            class_distribution=inference_res["class_distribution_percentage"],
            output_dataset_id=f"DS-{request.survey_id}-LC-RES"
        )
