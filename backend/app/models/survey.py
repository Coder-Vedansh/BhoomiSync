import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum, Float, Text, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class SurveyStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class Survey(Base):
    """
    Survey Entity
    Represents a specific land survey mission or resurvey campaign over an agricultural area.
    """
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    district = Column(String(128), nullable=True)
    state = Column(String(128), nullable=True)
    status = Column(Enum(SurveyStatus), default=SurveyStatus.PLANNED, nullable=False)
    
    survey_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Real-world Georeferenced Coordinates
    center_latitude = Column(Float, nullable=False, default=0.0)
    center_longitude = Column(Float, nullable=False, default=0.0)
    boundary_geojson = Column(JSON, nullable=True)  # GeoJSON Polygon of Survey Area in EPSG:4326
    
    total_area_hectares = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    lifecycle_stage = Column(String(64), default="PLANNED", nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    datasets = relationship("Dataset", back_populates="survey", cascade="all, delete-orphan")
    parcels = relationship("Parcel", back_populates="survey", cascade="all, delete-orphan")
