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


class LandStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISPUTED = "DISPUTED"
    MUTATION_IN_PROGRESS = "MUTATION_IN_PROGRESS"
    GOVERNMENT_ACQUIRED = "GOVERNMENT_ACQUIRED"
    ARCHIVED = "ARCHIVED"


class OwnershipType(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    JOINT = "JOINT"
    GOVERNMENT = "GOVERNMENT"
    COMMUNITY_PANCHAYAT = "COMMUNITY_PANCHAYAT"
    TRUST_INSTITUTIONAL = "TRUST_INSTITUTIONAL"


class RecordStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    OFFICIAL = "OFFICIAL"
    SUPERSEDED = "SUPERSEDED"


class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    AUTO_MATCHED = "AUTO_MATCHED"
    SURVEYOR_VERIFIED = "SURVEYOR_VERIFIED"
    DISPUTED = "DISPUTED"
    REJECTED = "REJECTED"


class MatchStatus(str, enum.Enum):
    MATCHED = "MATCHED"
    POSSIBLE_MATCH = "POSSIBLE_MATCH"
    NO_MATCH = "NO_MATCH"
    CONFLICT = "CONFLICT"


class LandRecordImportSession(Base):
    """
    Tracks land-record batch import sessions (CSV, JSON, GeoJSON, Mock Government).
    """
    __tablename__ = "land_record_import_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    source_name = Column(String(128), nullable=False)
    source_type = Column(String(32), default="CSV")  # CSV, JSON, GEOJSON, GOV_API, MOCK_DATASET
    filename = Column(String(256), nullable=True)
    checksum = Column(String(64), nullable=True)
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    duplicate_records = Column(Integer, default=0)
    validation_errors_json = Column(JSON, default=list)
    status = Column(String(32), default="COMPLETED")  # PROCESSING, COMPLETED, FAILED
    imported_by = Column(String(64), default="SYSTEM_ADMIN")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    records = relationship("LandRecord", back_populates="import_session")


class LandParcel(Base):
    """
    Core Cadastral Land Parcel Entity.
    Bridges official revenue records with BhoomiSync drone and AI intelligence.
    """
    __tablename__ = "land_parcels"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(String(64), unique=True, index=True, nullable=False)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=True, index=True)
    survey_number = Column(String(64), nullable=False, index=True)  # Khasra / Survey Number (e.g. 101, 102/1)
    subdivision_number = Column(String(32), nullable=True)         # Hissa / Subdivision (e.g. 1, 2)
    state = Column(String(64), default="Rajasthan")
    district = Column(String(64), default="Udaipur")
    tehsil = Column(String(64), default="Girwa")
    village = Column(String(64), default="Haripura", index=True)
    
    land_record_source = Column(String(128), default="Rajasthan Revenue Department (Apna Khata / Bhunaksha)")
    official_area_m2 = Column(Float, nullable=False)
    official_area_hectares = Column(Float, nullable=False)
    
    # Geometries stored in GeoJSON format (standard EPSG:4326 for GIS interchange)
    cadastral_geometry = Column(JSON, nullable=False)
    current_geometry = Column(JSON, nullable=True)        # Drone detected boundary
    verified_geometry = Column(JSON, nullable=True)       # Surveyor certified boundary
    geometry_source = Column(String(64), default="REVENUE_CADASTRAL_MAP")
    
    land_status = Column(Enum(LandStatus), default=LandStatus.ACTIVE, nullable=False)
    land_use = Column(String(64), default="AGRICULTURAL")
    ai_detected_land_use = Column(String(64), nullable=True)
    classification_confidence = Column(Float, default=0.92)
    
    drone_measured_area_m2 = Column(Float, nullable=True)
    verified_area_m2 = Column(Float, nullable=True)
    historical_area_m2 = Column(Float, nullable=True)
    
    ownership_status = Column(String(64), default="CLEAR_TITLED")
    record_status = Column(Enum(RecordStatus), default=RecordStatus.OFFICIAL, nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False)
    
    match_status = Column(Enum(MatchStatus), default=MatchStatus.MATCHED, nullable=False)
    match_confidence = Column(Float, default=0.95)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    survey = relationship("Survey", backref="land_parcels")
    ownerships = relationship("ParcelOwnership", back_populates="parcel", cascade="all, delete-orphan")
    records = relationship("LandRecord", back_populates="parcel", cascade="all, delete-orphan")
    cadastral_versions = relationship("CadastralVersion", back_populates="parcel", cascade="all, delete-orphan")
    change_records = relationship("ParcelChangeRecord", back_populates="parcel", cascade="all, delete-orphan")
    documents = relationship("ParcelDocument", back_populates="parcel", cascade="all, delete-orphan")


class LandOwner(Base):
    """
    Land Owner Record.
    Privacy-safe entity supporting masked public serialization and role-aware authorization.
    """
    __tablename__ = "land_owners"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String(64), unique=True, index=True, nullable=False)
    owner_reference = Column(String(64), unique=True, index=True, nullable=False)  # Privacy-masked reference (e.g. OWN-HR-001)
    name = Column(String(128), nullable=False)                                      # Real name (e.g. Ramesh Chandra Patel)
    ownership_type = Column(Enum(OwnershipType), default=OwnershipType.INDIVIDUAL, nullable=False)
    ownership_percentage = Column(Float, default=100.0)
    contact_reference = Column(String(64), nullable=True)                          # Privacy masked phone/email hash
    record_source = Column(String(128), default="Apna Khata Land Registry")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    parcels = relationship("ParcelOwnership", back_populates="owner")


class ParcelOwnership(Base):
    """
    Join table linking LandParcel to LandOwner with percentage shares and validity dates.
    """
    __tablename__ = "parcel_ownerships"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(Integer, ForeignKey("land_parcels.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("land_owners.id"), nullable=False, index=True)
    ownership_percentage = Column(Float, default=100.0, nullable=False)
    ownership_start_date = Column(DateTime, default=datetime.utcnow, nullable=True)
    ownership_end_date = Column(DateTime, nullable=True)
    ownership_status = Column(String(32), default="ACTIVE")  # ACTIVE, MUTATED, HISTORICAL
    source_record_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parcel = relationship("LandParcel", back_populates="ownerships")
    owner = relationship("LandOwner", back_populates="parcels")


class LandRecord(Base):
    """
    Source Land-Record Document / Data Archive.
    Stores raw imported document references, provenance checksums, and metadata.
    """
    __tablename__ = "land_records"

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(String(64), unique=True, index=True, nullable=False)
    parcel_id = Column(Integer, ForeignKey("land_parcels.id"), nullable=False, index=True)
    import_session_id = Column(Integer, ForeignKey("land_record_import_sessions.id"), nullable=True, index=True)
    record_type = Column(String(64), default="KHASRA_RECORD")  # KHASRA_RECORD, JAMABANDI, MUTATION, SETTLEMENT_SURVEY
    source = Column(String(128), nullable=False)
    document_reference = Column(String(128), nullable=True)
    record_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_date = Column(DateTime, default=datetime.utcnow, nullable=True)
    imported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    checksum = Column(String(64), nullable=True)
    metadata_json = Column(JSON, default=dict)

    parcel = relationship("LandParcel", back_populates="records")
    import_session = relationship("LandRecordImportSession", back_populates="records")


class CadastralVersion(Base):
    """
    Historical Versions of Parcel Boundaries.
    Maintains complete spatial evolution over time (1998, 2015, 2024, 2026).
    """
    __tablename__ = "cadastral_versions"

    id = Column(Integer, primary_key=True, index=True)
    parcel_id = Column(Integer, ForeignKey("land_parcels.id"), nullable=False, index=True)
    version_number = Column(String(32), nullable=False)  # "1998_CADASTRAL", "2015_SETTLEMENT", "2024_DRONE_PILOT", "2026_DRONE_RESURVEY"
    geometry = Column(JSON, nullable=False)
    source = Column(String(128), nullable=False)
    effective_date = Column(DateTime, nullable=False)
    captured_date = Column(DateTime, default=datetime.utcnow, nullable=True)
    area_m2 = Column(Float, nullable=False)
    created_by = Column(String(64), default="REVENUE_AUTHORITY")
    change_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parcel = relationship("LandParcel", back_populates="cadastral_versions")


class ParcelChangeRecord(Base):
    """
    Parcel-Level Change Detection & Potential Encroachment Record.
    Connects Prompt 4 AI geospatial change detections to the official parcel.
    """
    __tablename__ = "parcel_change_records"

    id = Column(Integer, primary_key=True, index=True)
    change_record_id = Column(String(64), unique=True, index=True, nullable=False)
    parcel_id = Column(Integer, ForeignKey("land_parcels.id"), nullable=False, index=True)
    change_type = Column(String(64), nullable=False)  # BOUNDARY_DISPLACEMENT, LAND_USE_CHANGE, NEW_STRUCTURE, POTENTIAL_ENCROACHMENT, NO_CHANGE
    severity = Column(String(32), default="MEDIUM")   # INFO, LOW, MEDIUM, HIGH, CRITICAL_ENCROACHMENT
    old_geometry = Column(JSON, nullable=True)
    new_geometry = Column(JSON, nullable=True)
    area_difference_m2 = Column(Float, default=0.0)
    boundary_shift_m = Column(Float, default=0.0)
    confidence = Column(Float, default=0.90)
    detection_job_id = Column(String(64), nullable=True)
    verification_status = Column(String(32), default="PENDING_SURVEYOR")  # PENDING_SURVEYOR, VERIFIED_VALID, DISMISSED_FALSE_POSITIVE
    surveyor_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parcel = relationship("LandParcel", back_populates="change_records")


class ParcelDocument(Base):
    """
    Documents associated with a parcel (PDF, GeoJSON, CSV, JPG) with object-storage references.
    """
    __tablename__ = "parcel_documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String(64), unique=True, index=True, nullable=False)
    parcel_id = Column(Integer, ForeignKey("land_parcels.id"), nullable=False, index=True)
    title = Column(String(128), nullable=False)
    document_type = Column(String(64), default="OWNERSHIP_RECORD")  # OWNERSHIP_RECORD, CADASTRAL_MAP, SURVEY_DOCUMENT, MUTATION_RECORD, LAND_USE_CERTIFICATE
    file_format = Column(String(16), default="PDF")                 # PDF, JPG, PNG, GEOJSON, CSV
    storage_path = Column(String(256), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    checksum = Column(String(64), nullable=True)
    source = Column(String(128), default="Sub-Registrar Office / Tehsil Record Room")
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata_json = Column(JSON, default=dict)

    parcel = relationship("LandParcel", back_populates="documents")
