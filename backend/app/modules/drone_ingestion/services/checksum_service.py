import re
import os
import hashlib
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.drone_ingestion.models import SensorDataObject, SensorDataType, ObjectStatus


class ChecksumService:
    """
    Cryptographic Checksum & File Validation Service.
    Guarantees asset integrity, validates MIME/extensions, and performs duplicate detection.
    """

    ALLOWED_EXTENSIONS = {
        SensorDataType.RGB: {".jpg", ".jpeg", ".png", ".tif", ".tiff"},
        SensorDataType.LIDAR: {".las", ".laz", ".ply"},
        SensorDataType.GNSS: {".json", ".csv", ".nmea", ".ubx", ".log"},
        SensorDataType.IMU: {".json", ".csv", ".log"},
        SensorDataType.TELEMETRY: {".json"},
    }

    ALLOWED_MIME_TYPES = {
        SensorDataType.RGB: {"image/jpeg", "image/png", "image/tiff", "application/octet-stream"},
        SensorDataType.LIDAR: {"application/octet-stream", "application/x-las", "application/x-laz", "text/plain"},
        SensorDataType.GNSS: {"application/json", "text/csv", "text/plain", "application/octet-stream"},
        SensorDataType.IMU: {"application/json", "text/csv", "text/plain", "application/octet-stream"},
        SensorDataType.TELEMETRY: {"application/json", "text/plain", "application/octet-stream"},
    }

    @classmethod
    def validate_sha256_format(cls, sha256: str) -> bool:
        """Validates that a string is a 64-character lowercase hexadecimal SHA-256 digest."""
        if not sha256 or len(sha256) != 64:
            return False
        return bool(re.match(r"^[0-9a-fA-F]{64}$", sha256))

    @classmethod
    def validate_sensor_file(
        cls,
        sensor_type: SensorDataType,
        filename: str,
        content_type: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates file extension and content type against allowed modalities.
        Rejects unsupported formats.
        """
        _, ext = os.path.splitext(filename.lower())
        allowed_exts = cls.ALLOWED_EXTENSIONS.get(sensor_type, set())

        if ext not in allowed_exts:
            return False, f"Invalid file extension '{ext}' for sensor modality {sensor_type.value}. Allowed: {sorted(list(allowed_exts))}"

        allowed_mimes = cls.ALLOWED_MIME_TYPES.get(sensor_type, set())
        clean_mime = content_type.split(";")[0].strip().lower()
        if clean_mime not in allowed_mimes and "octet-stream" not in clean_mime:
            return False, f"Invalid content type '{content_type}' for {sensor_type.value}. Allowed: {sorted(list(allowed_mimes))}"

        return True, None

    @classmethod
    def check_duplicate_or_existing(
        cls,
        db: Session,
        mission_id: str,
        sensor_type: SensorDataType,
        sequence_number: int,
        sha256: str,
    ) -> Tuple[bool, Optional[SensorDataObject]]:
        """
        Checks if the payload has already been ingested using either:
        1. The idempotency key: (mission_id + sensor_type + sequence_number)
        2. Content hash match: (mission_id + sha256)
        """
        existing_seq = db.query(SensorDataObject).filter(
            SensorDataObject.mission_id == mission_id,
            SensorDataObject.sensor_type == sensor_type,
            SensorDataObject.sequence_number == sequence_number,
        ).first()

        if existing_seq:
            return True, existing_seq

        existing_hash = db.query(SensorDataObject).filter(
            SensorDataObject.mission_id == mission_id,
            SensorDataObject.sha256 == sha256.lower(),
        ).first()

        if existing_hash:
            return True, existing_hash

        return False, None

    @classmethod
    def calculate_sha256(cls, data: bytes) -> str:
        """Calculates SHA-256 digest from byte buffer."""
        return hashlib.sha256(data).hexdigest()
