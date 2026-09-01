from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.response import StandardResponse
from app.modules.ai.land_use.schemas import AgriculturalDetectRequest
from app.modules.ai.land_use.service import LandUseService

router = APIRouter(prefix="/land-use", tags=["AI Land Use & Agriculture"])


@router.post("/agricultural-detect")
def detect_agricultural_land(
    payload: AgriculturalDetectRequest,
    db: Session = Depends(get_db),
):
    """
    Detects dedicated agricultural farm plots with crop type and NDVI vegetation indicators.
    """
    service = LandUseService(db)
    result = service.detect_crops_and_vegetation(
        survey_id=payload.survey_id,
        dataset_id=payload.dataset_id,
        confidence_threshold=payload.confidence_threshold or 0.60,
    )
    return StandardResponse.success_response(data=result, message="Agricultural detection completed")
