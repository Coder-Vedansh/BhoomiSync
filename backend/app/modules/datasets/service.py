from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.dataset import Dataset, DatasetFile
from app.schemas.dataset import DatasetDetail, DatasetFileSchema
from app.core.exceptions import NotFoundException


class DatasetService:
    def __init__(self, db: Session):
        self.db = db

    def get_dataset_by_code(self, dataset_id: str) -> DatasetDetail:
        dataset = self.db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
        if not dataset:
            raise NotFoundException("Dataset", dataset_id)

        files = self.db.query(DatasetFile).filter(DatasetFile.dataset_id == dataset.id).all()
        size_bytes = sum(f.file_size_bytes for f in files)
        file_schemas = [DatasetFileSchema.model_validate(f) for f in files]

        return DatasetDetail(
            id=dataset.id,
            dataset_id=dataset.dataset_id,
            survey_id=dataset.survey_id,
            parent_dataset_id=dataset.parent_dataset_id,
            dataset_type=dataset.dataset_type,
            source=dataset.source,
            status=dataset.status,
            is_immutable=dataset.is_immutable,
            metadata_json=dataset.metadata_json or {},
            description=dataset.description,
            file_count=len(files),
            total_size_bytes=size_bytes,
            created_at=dataset.created_at,
            updated_at=dataset.updated_at,
            files=file_schemas
        )

    def get_dataset_files(self, dataset_id: str) -> List[DatasetFileSchema]:
        dataset = self.db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
        if not dataset:
            raise NotFoundException("Dataset", dataset_id)

        files = self.db.query(DatasetFile).filter(DatasetFile.dataset_id == dataset.id).all()
        return [DatasetFileSchema.model_validate(f) for f in files]
