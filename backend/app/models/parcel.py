import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Float, JSON, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class LandUseType(str, enum.Enum):
    AGRICULTURAL_CROP = "AGRICULTURAL_CROP"
    AGRICULTURAL_FALLOW = "AGRICULTURAL_FALLOW"
    ORCHARD_PLANTATION = "ORCHARD_PLANTATION"
    WATER_BODY = "WATER_BODY"
    RESIDENTIAL_SETTLEMENT = "RESIDENTIAL_SETTLEMENT"
    RURAL_ROAD = "RURAL_ROAD"
    BARREN_LAND = "BARREN_LAND"
    UNCLASSIFIED = "UNCLASSIFIED"


class ParcelSource(str, enum.Enum):
    AI_SEGMENTATION = "AI_SEGMENTATION"
    MANUAL_DIGITIZED = "MANUAL_DIGITIZED"
    HISTORICAL_REVENUE_RECORD = "HISTORICAL_REVENUE_RECORD"
    SURVEYOR_VERIFIED = "SURVEYOR_VERIFIED"
    AUTO_DETECTED = "AUTO_DETECTED"


class VerificationStatus(str, enum.Enum):
    AI_DETECTED = "AI_DETECTED"
    AUTO_DETECTED = "AUTO_DETECTED"
    MANUALLY_EDITED = "MANUALLY_EDITED"
    FIELD_VERIFIED = "FIELD_VERIFIED"
    VERIFIED = "VERIFIED"


class ParcelAuditAction(str, enum.Enum):
    CREATED = "CREATED"
    BOUNDARY_EDITED = "BOUNDARY_EDITED"
    POINT_ADDED = "POINT_ADDED"
    POINT_MOVED = "POINT_MOVED"
    POINT_DELETED = "POINT_DELETED"
    SPLIT = "SPLIT"
    MERGED = "MERGED"
    STATUS_CHANGED = "STATUS_CHANGED"


class Parcel(Base):
    """
    Parcel Entity
    Represents an agricultural land plot or field boundary with real-world geospatial geometry.
    Supports versioning, terrain-aware surface area, and audit trails for surveyor edits.
    """
    __tablename__ = "parcels"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(String(64), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)

    # Real-world Geospatial Geometry (GeoJSON Polygon / MultiPolygon in EPSG:4326)
    geometry_geojson = Column(JSON, nullable=False)
    crs = Column(String(32), default="EPSG:4326", nullable=False)
    
    # Geodesic Horizontal Planar measurements
    area_m2 = Column(Float, nullable=False, default=0.0)
    area_hectares = Column(Float, nullable=False, default=0.0)
    perimeter_m = Column(Float, nullable=False, default=0.0)
    centroid_lat = Column(Float, nullable=False, default=0.0)
    centroid_lon = Column(Float, nullable=False, default=0.0)

    # Terrain-Aware 3D Surface Measurements (taking slope and DEM elevations into account)
    surface_area_m2 = Column(Float, nullable=False, default=0.0)
    surface_area_hectares = Column(Float, nullable=False, default=0.0)
    slope_degrees = Column(Float, nullable=False, default=0.0)
    elevation_min_m = Column(Float, nullable=False, default=0.0)
    elevation_max_m = Column(Float, nullable=False, default=0.0)

    land_use = Column(Enum(LandUseType), default=LandUseType.AGRICULTURAL_CROP, nullable=False)
    source = Column(Enum(ParcelSource), default=ParcelSource.AI_SEGMENTATION, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)  # 0.0 to 1.0
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.AI_DETECTED, nullable=False)
    
    version = Column(Integer, default=1, nullable=False)
    attributes_json = Column(JSON, default=dict, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    survey = relationship("Survey", back_populates="parcels")
    audit_logs = relationship("ParcelAuditLog", back_populates="parcel", cascade="all, delete-orphan")


class ParcelAuditLog(Base):
    """
    ParcelAuditLog Entity
    Provides full auditability and undo/redo/history for manual boundary editing operations.
    """
    __tablename__ = "parcel_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(Integer, ForeignKey("parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    action = Column(Enum(ParcelAuditAction), nullable=False)
    
    previous_geometry_geojson = Column(JSON, nullable=True)
    new_geometry_geojson = Column(JSON, nullable=False)
    
    editor_id = Column(String(64), default="system_surveyor", nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    parcel = relationship("Parcel", back_populates="audit_logs")


class DetectedBoundary(Base):
    """
    DetectedBoundary Entity
    Raw automatically detected candidate cadastral bunds and field boundaries.
    Preserved separately from surveyor-verified parcels.
    """
    __tablename__ = "detected_boundaries"

    id = Column(Integer, primary_key=True, index=True)
    boundary_id = Column(String(64), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False, index=True)
    
    geometry_geojson = Column(JSON, nullable=False)
    confidence_score = Column(Float, default=0.90, nullable=False)
    detection_method = Column(String(64), default="LIDAR_ELEVATION_RIDGE", nullable=False)
    source_dataset = Column(String(64), default="DS-2026-001-ORTHO", nullable=False)
    status = Column(String(32), default="DETECTED", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    survey = relationship("Survey")
