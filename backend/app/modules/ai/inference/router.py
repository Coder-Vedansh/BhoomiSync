from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.models.ai_results import AIModel, AIModelType, AIModelStatus
from app.modules.ai.inference.schemas import RunAllInferenceRequest, AIModelRegisterRequest
from app.modules.ai.inference.service import InferenceService

router = APIRouter(tags=["AI Inference Hub & Model Registry"])


@router.post("/inference/run-all")
def run_all_ai_inferences(
    payload: RunAllInferenceRequest,
    db: Session = Depends(get_db),
):
    """
    Triggers complete multi-sensor AI suite (Classification + Boundary Detection + Change Detection).
    """
    service = InferenceService(db)
    result = service.run_full_suite(payload.survey_id, payload.confidence_threshold or 0.60)
    return StandardResponse.success_response(data=result, message="Full AI suite executed successfully")


@router.get("/inference/survey/{survey_id}/summary")
def get_survey_ai_summary(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns high-level AI intelligence metrics and model breakdown for a survey.
    """
    service = InferenceService(db)
    summary = service.get_survey_summary(survey_id)
    return StandardResponse.success_response(data=summary)


@router.get("/models")
def list_ai_models(
    db: Session = Depends(get_db),
):
    """
    Lists all deployed AI models in the model registry.
    """
    records = db.query(AIModel).all()
    if not records:
        from app.db.seed import _seed_ai_data_for_survey
        from app.models.survey import Survey
        s = db.query(Survey).first()
        if s:
            _seed_ai_data_for_survey(db, s)
            records = db.query(AIModel).all()

    models_data = [
        {
            "model_id": m.model_id,
            "model_name": m.model_name,
            "model_type": m.model_type.value if hasattr(m.model_type, "value") else str(m.model_type),
            "version": m.version,
            "framework": m.framework,
            "classes": m.classes,
            "input_requirements": m.input_requirements,
            "sensor_requirements": m.sensor_requirements,
            "status": m.status.value if hasattr(m.status, "value") else str(m.status),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in records
    ]
    return StandardResponse.success_response(data={"total_models": len(models_data), "models": models_data})


@router.post("/models/register", status_code=status.HTTP_201_CREATED)
def register_ai_model(
    payload: AIModelRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Registers a new ML/DL model architecture or updated version in the registry.
    """
    m_type = getattr(AIModelType, payload.model_type, AIModelType.LAND_CLASSIFICATION)
    new_model = AIModel(
        model_id=payload.model_id,
        model_name=payload.model_name,
        model_type=m_type,
        version=payload.version,
        framework=payload.framework or "PyTorch / ONNX",
        classes=payload.classes,
        input_requirements=payload.input_requirements or [],
        sensor_requirements=payload.sensor_requirements or [],
        model_path=payload.model_path,
        status=AIModelStatus.ACTIVE,
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return StandardResponse.success_response(
        data={"model_id": new_model.model_id, "version": new_model.version, "status": "ACTIVE"},
        message="Model registered successfully",
    )
