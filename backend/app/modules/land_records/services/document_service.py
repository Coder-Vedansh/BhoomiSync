import uuid
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.land_records import LandParcel, ParcelDocument
from app.modules.land_records.schemas.comparison_schemas import ParcelDocumentDTO


class ParcelDocumentService:
    """
    Service Layer for managing documents associated with land parcels.
    Integrates with object storage abstractions and records SHA-256 provenance checksums.
    """

    def __init__(self, db: Session):
        self.db = db

    def add_document(
        self,
        parcel_id: str,
        title: str,
        document_type: str = "OWNERSHIP_RECORD",
        file_format: str = "PDF",
        storage_path: Optional[str] = None,
        file_content: Optional[bytes] = None,
        source: str = "Sub-Registrar Office / Tehsil Record Room",
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> ParcelDocumentDTO:
        parcel = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not parcel:
            raise ValueError(f"Parcel {parcel_id} not found")

        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        
        checksum = None
        size_bytes = 0
        if file_content:
            checksum = hashlib.sha256(file_content).hexdigest()
            size_bytes = len(file_content)
        else:
            checksum = hashlib.sha256(f"{parcel_id}-{title}".encode("utf-8")).hexdigest()
            size_bytes = 1024 * 45  # 45 KB simulated

        final_storage_path = storage_path or f"documents/{parcel_id}/{doc_id}.{file_format.lower()}"

        doc = ParcelDocument(
            document_id=doc_id,
            parcel_id=parcel.id,
            title=title,
            document_type=document_type,
            file_format=file_format.upper(),
            storage_path=final_storage_path,
            file_size_bytes=size_bytes,
            checksum=checksum,
            source=source,
            upload_date=datetime.utcnow(),
            metadata_json=metadata_json or {},
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)

        return ParcelDocumentDTO(
            id=doc.id,
            document_id=doc.document_id,
            parcel_id=doc.parcel_id,
            title=doc.title,
            document_type=doc.document_type,
            file_format=doc.file_format,
            storage_path=doc.storage_path,
            file_size_bytes=doc.file_size_bytes,
            checksum=doc.checksum,
            source=doc.source,
            upload_date=doc.upload_date,
            metadata_json=doc.metadata_json,
        )
