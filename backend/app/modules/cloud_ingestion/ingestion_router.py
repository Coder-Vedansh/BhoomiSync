import json
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.cloud_ingestion.ingestion_service import IngestionService
from app.schemas.ingestion import (
    SensorCreate,
    SensorSummary,
    UploadSessionCreate,
    UploadSessionSummary,
    UploadSessionDetail,
    UploadedFileSummary,
    UploadedFileDetail,
    ProcessingJobSchema,
    SpatialFootprintResponse
)
from app.core.response import ApiResponse, success_response

router = APIRouter(tags=["Drone Data Ingestion & Cloud Storage"])


def get_service(db: Session = Depends(get_db)) -> IngestionService:
    return IngestionService(db)


# ------------------------------------------------------------------------------
# Sensor Registry Endpoints
# ------------------------------------------------------------------------------
@router.get("/sensors", response_model=ApiResponse[List[SensorSummary]])
def list_sensors(service: IngestionService = Depends(get_service)):
    """
    Returns registered drone sensor payloads (Camera, LiDAR, RTK GNSS, IMU).
    """
    sensors = service.list_sensors()
    return success_response(data=sensors)


@router.post("/sensors", response_model=ApiResponse[SensorSummary])
def create_sensor(
    payload: SensorCreate,
    service: IngestionService = Depends(get_service)
):
    """
    Registers a new drone sensor payload specification.
    """
    sensor = service.create_sensor(payload)
    return success_response(data=sensor)


# ------------------------------------------------------------------------------
# Upload Session Endpoints
# ------------------------------------------------------------------------------
@router.post("/surveys/{survey_id}/upload-sessions", response_model=ApiResponse[UploadSessionDetail])
def create_upload_session(
    survey_id: str,
    payload: UploadSessionCreate,
    service: IngestionService = Depends(get_service)
):
    """
    Initializes a continuous / batched ingestion sync session for a survey mission.
    """
    session = service.create_upload_session(survey_id, payload)
    return success_response(data=session)


@router.get("/surveys/{survey_id}/upload-sessions", response_model=ApiResponse[List[UploadSessionSummary]])
def list_upload_sessions(
    survey_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Lists all upload sessions and sync batches for a survey.
    """
    sessions = service.list_upload_sessions(survey_id)
    return success_response(data=sessions)


@router.get("/upload-sessions/{session_id}", response_model=ApiResponse[UploadSessionDetail])
def get_upload_session(
    session_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Retrieves progress, uploaded byte counts, and lifecycle status for a session.
    """
    session = service.get_upload_session(session_id)
    return success_response(data=session)


@router.post("/upload-sessions/{session_id}/complete", response_model=ApiResponse[UploadSessionDetail])
def complete_upload_session(
    session_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Finalizes an upload session after all files have been transferred.
    """
    session = service.complete_upload_session(session_id)
    return success_response(data=session)


# ------------------------------------------------------------------------------
# File Upload & Ingestion Endpoints
# ------------------------------------------------------------------------------
@router.post("/surveys/{survey_id}/upload", response_model=ApiResponse[UploadedFileDetail])
async def upload_survey_file(
    survey_id: str,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    dataset_id: Optional[str] = Form(None),
    sensor_id: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),
    service: IngestionService = Depends(get_service)
):
    """
    Multipart continuous upload endpoint for drone data (Camera JPEG/PNG, LiDAR LAS/LAZ, RTK logs).
    Extracts EXIF/LiDAR metadata, computes SHA-256 hash, checks for duplicates, and enqueues processing.
    """
    meta_dict = None
    if metadata:
        try:
            meta_dict = json.loads(metadata)
        except Exception:
            pass

    uploaded = await service.ingest_file(
        survey_code=survey_id,
        upload_file=file,
        session_id_str=session_id,
        dataset_code=dataset_id,
        sensor_code=sensor_id,
        metadata_override=meta_dict
    )
    return success_response(data=uploaded)


@router.post("/datasets/{dataset_id}/files", response_model=ApiResponse[UploadedFileDetail])
async def upload_file_to_dataset(
    dataset_id: str,
    file: UploadFile = File(...),
    survey_id: str = Form("SUR-2026-001"),
    session_id: Optional[str] = Form(None),
    sensor_id: Optional[str] = Form(None),
    service: IngestionService = Depends(get_service)
):
    """
    Uploads a sensor or processed file directly to a specific dataset catalog.
    """
    uploaded = await service.ingest_file(
        survey_code=survey_id,
        upload_file=file,
        session_id_str=session_id,
        dataset_code=dataset_id,
        sensor_code=sensor_id
    )
    return success_response(data=uploaded)


@router.get("/files/{file_id}", response_model=ApiResponse[UploadedFileDetail])
def get_uploaded_file(
    file_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Retrieves full metadata, storage keys, EXIF attributes, and validation status for an uploaded file.
    """
    file_info = service.get_file(file_id)
    return success_response(data=file_info)


@router.get("/surveys/{survey_id}/files", response_model=ApiResponse[List[UploadedFileSummary]])
def list_survey_files(
    survey_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Lists all uploaded raw sensor files for a survey.
    """
    files = service.list_survey_files(survey_id)
    return success_response(data=files)


@router.post("/files/{file_id}/retry", response_model=ApiResponse[UploadedFileDetail])
def retry_failed_file(
    file_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Retries validation or re-triggers the downstream processing job for a failed file.
    """
    retried = service.retry_file(file_id)
    return success_response(data=retried)


# ------------------------------------------------------------------------------
# Processing Jobs & Spatial Footprint Endpoints
# ------------------------------------------------------------------------------
@router.get("/processing/jobs", response_model=ApiResponse[List[ProcessingJobSchema]])
def list_processing_jobs(
    survey_id: Optional[str] = Query(None),
    service: IngestionService = Depends(get_service)
):
    """
    Returns the queue of modular processing jobs triggered by data ingestion.
    """
    jobs = service.list_processing_jobs(survey_id)
    return success_response(data=jobs)


@router.get("/surveys/{survey_id}/spatial-footprint", response_model=ApiResponse[SpatialFootprintResponse])
def get_survey_spatial_footprint(
    survey_id: str,
    service: IngestionService = Depends(get_service)
):
    """
    Returns GeoJSON FeatureCollections of all camera photo capture points, LiDAR coverage footprints,
    and RTK flight trajectory paths for direct overlay on the GIS map.
    """
    footprint = service.get_spatial_footprint(survey_id)
    return success_response(data=footprint)
