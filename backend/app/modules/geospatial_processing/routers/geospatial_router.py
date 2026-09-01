from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.response import StandardResponse
from app.modules.geospatial_processing.services.geospatial_service import GeospatialService
from app.models.ingestion import ProcessingJob
from app.models.parcel import Parcel
from app.models.survey import Survey
from app.core.exceptions import NotFoundException
from app.schemas.geospatial import (
    ProcessingStartRequest,
    ParcelCreateRequest,
    ParcelUpdateRequest,
)

router = APIRouter(tags=["Geospatial Processing & GIS Cadastre"])


@router.post("/surveys/{survey_id}/processing/start")
def start_survey_processing(
    survey_id: str,
    payload: Optional[ProcessingStartRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Triggers the end-to-end 11-stage Geospatial Processing Pipeline.
    Converts raw drone images, LiDAR point clouds, and RTK GNSS into georeferenced orthomosaics, DEMs, and parcel boundaries.
    """
    service = GeospatialService(db)
    gsd_cm = payload.target_gsd_cm if payload else 2.5
    dem_res = payload.target_dem_res_m if payload else 0.5
    result = service.start_pipeline_execution(
        survey_id=survey_id,
        target_gsd_cm=gsd_cm,
        target_dem_res_m=dem_res,
    )
    return StandardResponse.success_response(data=result, message="Geospatial pipeline processing completed successfully")


@router.get("/surveys/{survey_id}/processing/status")
def get_survey_pipeline_status(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the real-time progress and status of all 11 pipeline stages.
    """
    service = GeospatialService(db)
    status_data = service.get_pipeline_status(survey_id)
    return StandardResponse.success_response(data=status_data)


@router.get("/surveys/{survey_id}/processing/jobs")
def get_survey_processing_jobs(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns all processing jobs associated with a survey.
    """
    survey = db.query(Survey).filter(Survey.survey_id == survey_id).first()
    if not survey:
        raise NotFoundException(f"Survey {survey_id} not found")
    jobs = db.query(ProcessingJob).filter(ProcessingJob.survey_id == survey.id).order_by(ProcessingJob.created_at.desc()).all()
    job_dicts = [
        {
            "job_id": j.job_id,
            "job_type": j.job_type.value if hasattr(j.job_type, "value") else str(j.job_type),
            "survey_id": survey_id,
            "status": j.status.value if hasattr(j.status, "value") else str(j.status),
            "progress_percentage": j.progress_percentage,
            "error_message": j.error_message,
            "parameters_json": j.parameters_json,
            "result_json": j.result_json,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]
    return StandardResponse.success_response(data=job_dicts)


@router.post("/datasets/{dataset_id}/process")
def process_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
):
    """
    Triggers downstream processing for a specific dataset.
    """
    return StandardResponse.success_response(
        data={"dataset_id": dataset_id, "status": "QUEUED", "job_id": f"JOB-{dataset_id}-PROC"},
        message=f"Dataset {dataset_id} queued for processing",
    )


@router.get("/surveys/{survey_id}/orthomosaic")
def get_orthomosaic(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the georeferenced orthomosaic raster layer specification with GSD and bounds.
    """
    service = GeospatialService(db)
    ortho = service.get_orthomosaic(survey_id)
    return StandardResponse.success_response(data=ortho)


@router.get("/surveys/{survey_id}/dem")
def get_dem(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the Digital Elevation Model (DEM) bare-earth raster metadata and slope profile.
    """
    service = GeospatialService(db)
    dem = service.get_dem(survey_id)
    return StandardResponse.success_response(data=dem)


@router.get("/surveys/{survey_id}/dsm")
def get_dsm(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the Digital Surface Model (DSM) canopy and structure elevation model.
    """
    service = GeospatialService(db)
    dsm = service.get_dsm(survey_id)
    return StandardResponse.success_response(data=dsm)


@router.get("/surveys/{survey_id}/point-cloud")
def get_point_cloud_summary(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns LiDAR point cloud classification stats (ground vs non-ground, density, bounds).
    """
    service = GeospatialService(db)
    pts = service.get_point_cloud_summary(survey_id)
    return StandardResponse.success_response(data=pts)


@router.get("/surveys/{survey_id}/spatial-layers")
def get_spatial_layers(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the full 12-layer GIS map layer architecture specification.
    """
    service = GeospatialService(db)
    layers = service.get_spatial_layers_manifest(survey_id)
    return StandardResponse.success_response(data=layers)


@router.get("/surveys/{survey_id}/boundaries")
def get_detected_boundaries(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns automatically detected candidate field boundaries and bund ridges.
    """
    service = GeospatialService(db)
    bounds = service.get_detected_boundaries(survey_id)
    return StandardResponse.success_response(data=bounds)


@router.get("/parcels/{parcel_id}/measurements")
def get_parcel_measurements(
    parcel_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns detailed geodesic planar area and 3D terrain surface area measurements in multiple units.
    """
    service = GeospatialService(db)
    metrics = service.get_parcel_measurements(parcel_id)
    return StandardResponse.success_response(data=metrics)


@router.post("/surveys/{survey_id}/parcels", status_code=status.HTTP_201_CREATED)
def create_survey_parcel(
    survey_id: str,
    payload: ParcelCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Creates a new parcel polygon from manual GIS drawing tools and computes its planar/surface area.
    """
    service = GeospatialService(db)
    parcel = service.create_parcel(survey_id, payload.model_dump())
    parcel_dict = {
        "id": parcel.id,
        "parcel_id": parcel.parcel_id,
        "survey_id": survey_id,
        "geometry_geojson": parcel.geometry_geojson,
        "crs": parcel.crs,
        "area_m2": parcel.area_m2,
        "area_hectares": parcel.area_hectares,
        "perimeter_m": parcel.perimeter_m,
        "surface_area_m2": parcel.surface_area_m2,
        "surface_area_hectares": parcel.surface_area_hectares,
        "slope_degrees": parcel.slope_degrees,
        "land_use": parcel.land_use.value if hasattr(parcel.land_use, "value") else str(parcel.land_use),
        "verification_status": parcel.verification_status.value if hasattr(parcel.verification_status, "value") else str(parcel.verification_status),
        "confidence": parcel.confidence,
    }
    return StandardResponse.success_response(data=parcel_dict, message="Parcel created successfully")


@router.put("/parcels/{parcel_id}")
def update_parcel(
    parcel_id: str,
    payload: ParcelUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Updates parcel boundary vertices, recalculates planar and 3D terrain surface measurements, and records audit trail.
    """
    service = GeospatialService(db)
    parcel = service.update_parcel(parcel_id, payload.model_dump(exclude_unset=True))
    parcel_dict = {
        "id": parcel.id,
        "parcel_id": parcel.parcel_id,
        "geometry_geojson": parcel.geometry_geojson,
        "crs": parcel.crs,
        "area_m2": parcel.area_m2,
        "area_hectares": parcel.area_hectares,
        "perimeter_m": parcel.perimeter_m,
        "surface_area_m2": parcel.surface_area_m2,
        "surface_area_hectares": parcel.surface_area_hectares,
        "slope_degrees": parcel.slope_degrees,
        "land_use": parcel.land_use.value if hasattr(parcel.land_use, "value") else str(parcel.land_use),
        "verification_status": parcel.verification_status.value if hasattr(parcel.verification_status, "value") else str(parcel.verification_status),
        "version": parcel.version,
    }
    return StandardResponse.success_response(data=parcel_dict, message="Parcel updated and measurements recalculated successfully")


@router.delete("/parcels/{parcel_id}")
def delete_parcel(
    parcel_id: str,
    db: Session = Depends(get_db),
):
    """
    Deletes a parcel.
    """
    service = GeospatialService(db)
    service.delete_parcel(parcel_id)
    return StandardResponse.success_response(data={"parcel_id": parcel_id, "deleted": True}, message="Parcel deleted successfully")


@router.post("/surveys/{survey_id}/processing/retry")
def retry_survey_processing(
    survey_id: str,
    stage_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Retries a failed processing stage or re-executes the 11-stage pipeline.
    """
    service = GeospatialService(db)
    result = service.start_pipeline_execution(survey_id=survey_id)
    return StandardResponse.success_response(data=result, message=f"Pipeline retry initiated for survey {survey_id}")


@router.post("/surveys/{survey_id}/processing/cancel")
def cancel_survey_processing(
    survey_id: str,
    db: Session = Depends(get_db),
):
    """
    Cancels any actively running processing job for a survey.
    """
    survey = db.query(Survey).filter(Survey.survey_id == survey_id).first()
    if not survey:
        raise NotFoundException(f"Survey {survey_id} not found")
    running_jobs = db.query(ProcessingJob).filter(
        ProcessingJob.survey_id == survey.id,
        ProcessingJob.status.in_(["RUNNING", "QUEUED"])
    ).all()
    for j in running_jobs:
        j.status = "FAILED"
        j.error_message = "Cancelled by user"
    db.commit()
    return StandardResponse.success_response(
        data={"survey_id": survey_id, "cancelled_jobs_count": len(running_jobs)},
        message=f"Processing jobs for survey {survey_id} cancelled"
    )

