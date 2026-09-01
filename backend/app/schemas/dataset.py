from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.dataset import DatasetType, DatasetSource, DatasetStatus, FileProcessingStatus


class DatasetFileSchema(BaseModel):
    id: int
    file_id: str
    dataset_id: int
    filename: str
    file_type: str
    file_size_bytes: int
    checksum: str
    storage_provider: str
    storage_key: str
    capture_timestamp: Optional[datetime] = None
    processing_status: FileProcessingStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetCreate(BaseModel):
    dataset_id: Optional[str] = None
    survey_id: int
    parent_dataset_id: Optional[int] = None
    dataset_type: DatasetType
    source: DatasetSource = DatasetSource.DRONE_ACQUISITION
    status: DatasetStatus = DatasetStatus.READY
    is_immutable: bool = True
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None


class DatasetSummary(BaseModel):
    id: int
    dataset_id: str
    survey_id: int
    parent_dataset_id: Optional[int] = None
    dataset_type: DatasetType
    source: DatasetSource
    status: DatasetStatus
    is_immutable: bool
    metadata_json: Dict[str, Any]
    description: Optional[str] = None
    file_count: int = 0
    total_size_bytes: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetDetail(DatasetSummary):
    files: List[DatasetFileSchema] = Field(default_factory=list)


class LineageNode(BaseModel):
    id: int
    dataset_id: str
    dataset_type: DatasetType
    source: DatasetSource
    status: DatasetStatus


class LineageEdge(BaseModel):
    source_dataset_id: str
    derived_dataset_id: str
    transformation_type: str


class SurveyLineageGraph(BaseModel):
    survey_id: str
    nodes: List[LineageNode]
    edges: List[LineageEdge]
