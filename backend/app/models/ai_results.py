import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    Text,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


class AIModelType(str, enum.Enum):
    LAND_CLASSIFICATION = "LAND_CLASSIFICATION"
    INSTANCE_SEGMENTATION = "INSTANCE_SEGMENTATION"
    SEMANTIC_SEGMENTATION = "SEMANTIC_SEGMENTATION"
    BOUNDARY_DETECTION = "BOUNDARY_DETECTION"
    CHANGE_DETECTION = "CHANGE_DETECTION"
    MULTI_SENSOR_FUSION = "MULTI_SENSOR_FUSION"


class AIModelStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    STANDBY = "STANDBY"
    DEPRECATED = "DEPRECATED"
    TRAINING = "TRAINING"


class AIVerificationStatus(str, enum.Enum):
    CANDIDATE = "CANDIDATE"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    MANUALLY_EDITED = "MANUALLY_EDITED"


class AIChangeSeverity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL_ENCROACHMENT = "CRITICAL_ENCROACHMENT"


class AIModel(Base):
    """
    AI Model Registry Entity.
    Tracks all machine learning & vision models deployed for cadastral intelligence.
    """
    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(64), unique=True, index=True, nullable=False)
    model_name = Column(String(128), nullable=False)
    model_type = Column(Enum(AIModelType), nullable=False)
    version = Column(String(32), nullable=False)
    framework = Column(String(64), default="PyTorch / ONNX / Ultralytics")
    classes = Column(JSON, nullable=False)  # List of string class labels
    input_requirements = Column(JSON, default=list)  # e.g. ["RGB_ORTHOMOSAIC", "DEM_RASTER"]
    sensor_requirements = Column(JSON, default=list)  # e.g. ["CAMERA", "LIDAR"]
    model_path = Column(String(256), nullable=True)
    checksum = Column(String(64), nullable=True)
    status = Column(Enum(AIModelStatus), default=AIModelStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    activated_at = Column(DateTime, default=datetime.utcnow, nullable=True)


class AIInferenceResult(Base):
    """
    Top-Level AI Inference Execution Record.
    Anchors multi-modal predictions to a specific survey and processing job.
    """
    __tablename__ = "ai_inference_results"

    id = Column(Integer, primary_key=True, index=True)
    inference_id = Column(String(64), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("processing_jobs.id"), nullable=True, index=True)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(32), nullable=False)
    inference_type = Column(Enum(AIModelType), nullable=False)
    execution_time_ms = Column(Float, default=0.0)
    confidence_overall = Column(Float, default=0.0)
    summary_metrics_json = Column(JSON, default=dict)
    parameters_json = Column(JSON, default=dict)
    is_demo_simulation = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    survey = relationship("Survey", backref="ai_inferences")
    classifications = relationship("AIClassificationResult", back_populates="inference", cascade="all, delete-orphan")
    boundaries = relationship("AIBoundaryResult", back_populates="inference", cascade="all, delete-orphan")
    changes = relationship("AIChangeResult", back_populates="inference", cascade="all, delete-orphan")


class AIClassificationResult(Base):
    """
    Georeferenced Land Classification Region.
    Stores categorized land-use polygons (Agricultural, Fallow, Water, Building, etc.).
    """
    __tablename__ = "ai_classification_results"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(String(64), unique=True, index=True, nullable=False)
    inference_id = Column(Integer, ForeignKey("ai_inference_results.id"), nullable=False, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False, index=True)
    class_name = Column(String(64), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    area_m2 = Column(Float, nullable=False)
    area_hectares = Column(Float, nullable=False)
    percentage = Column(Float, default=0.0)
    geometry_geojson = Column(JSON, nullable=False)
    crs = Column(String(32), default="EPSG:4326")
    source_dataset_id = Column(String(64), nullable=True)
    model_version = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    inference = relationship("AIInferenceResult", back_populates="classifications")


class AIBoundaryResult(Base):
    """
    AI Candidate Parcel Boundary.
    Derived from multi-sensor edge, ridge, and vegetation discontinuity detection.
    """
    __tablename__ = "ai_boundary_results"

    id = Column(Integer, primary_key=True, index=True)
    boundary_id = Column(String(64), unique=True, index=True, nullable=False)
    inference_id = Column(Integer, ForeignKey("ai_inference_results.id"), nullable=False, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False, index=True)
    boundary_type = Column(String(64), default="FIELD_BUND_RIDGE")  # FIELD_BUND_RIDGE, CROP_TRANSITION, ROAD_EDGE, WATER_SHORELINE
    confidence = Column(Float, nullable=False)
    sources_json = Column(JSON, default=list)  # ["LIDAR", "RGB_ORTHOMOSAIC", "DEM_GRADIENT"]
    geometry_geojson = Column(JSON, nullable=False)
    crs = Column(String(32), default="EPSG:4326")
    length_m = Column(Float, default=0.0)
    estimated_area_m2 = Column(Float, default=0.0)
    verification_status = Column(Enum(AIVerificationStatus), default=AIVerificationStatus.CANDIDATE, nullable=False)
    surveyor_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verified_at = Column(DateTime, nullable=True)

    inference = relationship("AIInferenceResult", back_populates="boundaries")


class AIChangeResult(Base):
    """
    Historical Cadastre vs Modern Drone Survey Change & Potential Encroachment.
    Flags differences in boundaries, land-use, and structures with severity ratings.
    """
    __tablename__ = "ai_change_results"

    id = Column(Integer, primary_key=True, index=True)
    change_id = Column(String(64), unique=True, index=True, nullable=False)
    inference_id = Column(Integer, ForeignKey("ai_inference_results.id"), nullable=False, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False, index=True)
    change_type = Column(String(64), nullable=False)  # BOUNDARY_SHIFT, LAND_USE_CHANGE, NEW_STRUCTURE, ROAD_EXPANSION, POTENTIAL_ENCROACHMENT
    severity = Column(Enum(AIChangeSeverity), default=AIChangeSeverity.MEDIUM, nullable=False)
    old_value = Column(String(128), nullable=False)
    new_value = Column(String(128), nullable=False)
    area_affected_m2 = Column(Float, default=0.0)
    percentage_change = Column(Float, default=0.0)
    confidence = Column(Float, nullable=False)
    geometry_geojson = Column(JSON, nullable=False)
    crs = Column(String(32), default="EPSG:4326")
    historical_dataset_id = Column(String(64), nullable=True)
    current_dataset_id = Column(String(64), nullable=True)
    audit_status = Column(String(32), default="PENDING_SURVEYOR_REVIEW")  # PENDING_SURVEYOR_REVIEW, VERIFIED_VALID, DISMISSED_FALSE_POSITIVE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    inference = relationship("AIInferenceResult", back_populates="changes")


class AIAuditLog(Base):
    """
    Human-in-the-Loop Verification and Modification Audit Record.
    Guarantees full lineage tracking of human surveyor adjustments over AI predictions.
    """
    __tablename__ = "ai_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    target_type = Column(String(32), nullable=False)  # BOUNDARY, CLASSIFICATION, CHANGE_DETECTION
    target_id = Column(String(64), nullable=False, index=True)
    user_action = Column(String(32), nullable=False)  # ACCEPT, REJECT, EDIT_VERTICES, OVERRIDE_CLASS, SPLIT, MERGE
    original_ai_result_json = Column(JSON, nullable=False)
    edited_geometry_geojson = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    surveyor_id = Column(String(64), default="SURVEYOR_OFFICIAL")
    model_version = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
