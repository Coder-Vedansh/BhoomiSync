import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, BigInteger, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class DatasetType(str, enum.Enum):
    IMAGE = "IMAGE"
    LIDAR = "LIDAR"
    RTK = "RTK"
    TELEMETRY = "TELEMETRY"
    METADATA = "METADATA"
    ORTHOMOSAIC = "ORTHOMOSAIC"
    DEM = "DEM"
    DSM = "DSM"
    PARCEL = "PARCEL"
    AI_RESULT = "AI_RESULT"
    COMPARISON_RESULT = "COMPARISON_RESULT"


class DatasetSource(str, enum.Enum):
    DRONE_ACQUISITION = "DRONE_ACQUISITION"
    PROCESSING_PIPELINE = "PROCESSING_PIPELINE"
    AI_INFERENCE = "AI_INFERENCE"
    MANUAL_GIS = "MANUAL_GIS"
    HISTORICAL_RECORD = "HISTORICAL_RECORD"


class DatasetStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


class FileProcessingStatus(str, enum.Enum):
    RAW = "RAW"
    VERIFIED = "VERIFIED"
    INDEXED = "INDEXED"
    PROCESSED = "PROCESSED"


class Dataset(Base):
    """
    Dataset Entity
    Belongs to a survey. Represents raw acquisitions or derived processing/AI results.
    Preserves immutability of raw datasets for data lineage.
    """
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String(64), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)

    dataset_type = Column(Enum(DatasetType), nullable=False)
    source = Column(Enum(DatasetSource), default=DatasetSource.DRONE_ACQUISITION, nullable=False)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.READY, nullable=False)
    
    # Immutability flag to protect raw data from being overwritten
    is_immutable = Column(Boolean, default=True, nullable=False)
    
    metadata_json = Column(JSON, default=dict, nullable=False)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    survey = relationship("Survey", back_populates="datasets")
    files = relationship("DatasetFile", back_populates="dataset", cascade="all, delete-orphan")
    
    # Lineage links
    parent_dataset = relationship("Dataset", remote_side=[id], backref="derived_datasets")
    
    lineage_as_source = relationship(
        "DatasetLineage",
        foreign_keys="[DatasetLineage.source_dataset_id]",
        back_populates="source_dataset",
        cascade="all, delete-orphan"
    )
    lineage_as_derived = relationship(
        "DatasetLineage",
        foreign_keys="[DatasetLineage.derived_dataset_id]",
        back_populates="derived_dataset",
        cascade="all, delete-orphan"
    )


class DatasetFile(Base):
    """
    DatasetFile Entity
    Stores metadata and object-storage pointers for files (images, LAS, RINEX, GeoTIFF, etc.)
    Raw binary data is NOT stored in PostgreSQL; it is kept in Object Storage.
    """
    __tablename__ = "dataset_files"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(64), unique=True, index=True, nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)

    filename = Column(String(255), nullable=False)
    file_type = Column(String(128), nullable=False)  # MIME or format e.g. image/tiff, application/las
    file_size_bytes = Column(BigInteger, default=0, nullable=False)
    checksum = Column(String(64), nullable=False)  # SHA-256 hash for data integrity
    
    # Object Storage Abstraction Reference
    storage_provider = Column(String(32), default="MOCK", nullable=False)
    storage_key = Column(String(512), nullable=False)  # Path/URI in bucket/storage
    
    capture_timestamp = Column(DateTime, nullable=True)
    processing_status = Column(Enum(FileProcessingStatus), default=FileProcessingStatus.RAW, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    dataset = relationship("Dataset", back_populates="files")


class DatasetLineage(Base):
    """
    DatasetLineage Entity
    Explicit provenance tracking between parent (raw/source) and child (derived/AI) datasets.
    """
    __tablename__ = "dataset_lineages"

    id = Column(Integer, primary_key=True, index=True)
    source_dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    derived_dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    
    transformation_type = Column(String(64), nullable=False)  # PHOTOGRAMMETRY_STITCH, LIDAR_DEM, AI_PARCEL_SEGMENTATION
    parameters_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    source_dataset = relationship("Dataset", foreign_keys=[source_dataset_id], back_populates="lineage_as_source")
    derived_dataset = relationship("Dataset", foreign_keys=[derived_dataset_id], back_populates="lineage_as_derived")
