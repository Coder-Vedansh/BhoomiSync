from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.datasets.service import DatasetService
from app.schemas.dataset import DatasetDetail, DatasetFileSchema
from app.core.response import ApiResponse, success_response

router = APIRouter(prefix="/datasets", tags=["Datasets"])


def get_service(db: Session = Depends(get_db)) -> DatasetService:
    return DatasetService(db)


@router.get("/{dataset_id}", response_model=ApiResponse[DatasetDetail])
def get_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_service)
):
    """
    Retrieves dataset metadata and file references by dataset identifier (e.g. DS-2026-001-CAM).
    """
    dataset = service.get_dataset_by_code(dataset_id)
    return success_response(data=dataset)


@router.get("/{dataset_id}/files", response_model=ApiResponse[List[DatasetFileSchema]])
def get_dataset_files(
    dataset_id: str,
    service: DatasetService = Depends(get_service)
):
    """
    Returns the list of storage object files, sizes, checksums, and storage keys for a dataset.
    """
    files = service.get_dataset_files(dataset_id)
    return success_response(data=files)
