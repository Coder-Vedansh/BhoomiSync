import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.land_records import (
    LandParcel,
    LandOwner,
    ParcelOwnership,
    LandRecord,
    CadastralVersion,
    LandRecordImportSession,
    OwnershipType,
    LandStatus,
    RecordStatus,
    VerificationStatus,
    MatchStatus,
)
from app.modules.land_records.importers import (
    BaseLandRecordImporter,
    CSVLandRecordImporter,
    JSONLandRecordImporter,
    GeoJSONLandRecordImporter,
    MockGovernmentDatasetImporter,
)
from app.modules.land_records.schemas.import_schemas import (
    LandRecordImportRequest,
    ImportSessionResponse,
    ImportSessionDetailResponse,
)


class LandRecordService:
    """
    Service Layer for managing batch imports of Cadastral & Land Records (CSV, JSON, GeoJSON, Mock Dataset).
    """

    def __init__(self, db: Session):
        self.db = db

    def import_records(self, req: LandRecordImportRequest) -> ImportSessionDetailResponse:
        session_id = f"IMP-SESS-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:4].upper()}"
        source_type = req.source_type.upper().strip()

        # Select appropriate importer
        if source_type == "CSV":
            importer = CSVLandRecordImporter()
        elif source_type == "JSON":
            importer = JSONLandRecordImporter()
        elif source_type == "GEOJSON":
            importer = GeoJSONLandRecordImporter()
        else:  # MOCK_GOV or default
            importer = MockGovernmentDatasetImporter()

        content = req.raw_content or ""
        checksum = BaseLandRecordImporter.compute_sha256(content) if content else None

        valid_records, validation_errors = importer.parse(content)

        import_session = LandRecordImportSession(
            session_id=session_id,
            source_name=req.source_name,
            source_type=source_type,
            filename=req.filename,
            checksum=checksum,
            total_records=len(valid_records) + len(validation_errors),
            successful_records=0,
            failed_records=len(validation_errors),
            duplicate_records=0,
            validation_errors_json=validation_errors,
            status="PROCESSING",
            imported_by=req.imported_by,
            created_at=datetime.utcnow(),
        )
        self.db.add(import_session)
        self.db.flush()

        successful = 0
        duplicates = 0

        for r in valid_records:
            parcel_id = r["parcel_id"]
            existing = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
            if existing:
                duplicates += 1
                continue

            # 1. Create or Find Owner
            owner_name = r.get("owner_name", "Registered Khatedar")
            owner_ref = f"OWN-HR-{uuid.uuid4().hex[:6].upper()}"
            owner_type = OwnershipType.INDIVIDUAL
            try:
                owner_type = OwnershipType[r.get("owner_type", "INDIVIDUAL").upper()]
            except Exception:
                pass

            owner = LandOwner(
                owner_id=f"OWN-ID-{uuid.uuid4().hex[:6].upper()}",
                owner_reference=owner_ref,
                name=owner_name,
                ownership_type=owner_type,
                ownership_percentage=100.0,
                contact_reference=f"HASH-{uuid.uuid4().hex[:8]}",
                record_source=r.get("land_record_source", req.source_name),
                created_at=datetime.utcnow(),
            )
            self.db.add(owner)
            self.db.flush()

            # 2. Create LandParcel
            parcel = LandParcel(
                parcel_id=parcel_id,
                survey_number=r["survey_number"],
                subdivision_number=r.get("subdivision_number", "1"),
                state=r.get("state", "Rajasthan"),
                district=r.get("district", "Udaipur"),
                tehsil=r.get("tehsil", "Girwa"),
                village=r.get("village", "Haripura"),
                land_record_source=r.get("land_record_source", req.source_name),
                official_area_m2=r["official_area_m2"],
                official_area_hectares=r["official_area_hectares"],
                cadastral_geometry=r["cadastral_geometry"],
                current_geometry=r.get("current_geometry"),
                verified_geometry=r.get("verified_geometry"),
                geometry_source=r.get("geometry_source", "REVENUE_CADASTRAL_MAP"),
                land_status=LandStatus.ACTIVE,
                land_use=r.get("land_use", "AGRICULTURAL"),
                ai_detected_land_use=r.get("ai_detected_land_use", r.get("land_use")),
                classification_confidence=r.get("classification_confidence", 0.92),
                drone_measured_area_m2=r.get("drone_measured_area_m2"),
                verified_area_m2=r.get("verified_area_m2"),
                historical_area_m2=r.get("historical_area_m2"),
                ownership_status=r.get("ownership_status", "CLEAR_TITLED"),
                record_status=RecordStatus.OFFICIAL,
                verification_status=VerificationStatus.SURVEYOR_VERIFIED if r.get("verified_area_m2") else VerificationStatus.PENDING,
                match_status=MatchStatus[r.get("match_status", "MATCHED")] if r.get("match_status") in MatchStatus.__members__ else MatchStatus.MATCHED,
                match_confidence=r.get("match_confidence", 0.95),
                notes=r.get("notes"),
                created_at=datetime.utcnow(),
            )
            self.db.add(parcel)
            self.db.flush()

            # 3. Create ParcelOwnership Link
            ownership_link = ParcelOwnership(
                parcel_id=parcel.id,
                owner_id=owner.id,
                ownership_percentage=100.0,
                ownership_start_date=datetime.utcnow(),
                ownership_status="ACTIVE",
                source_record_id=session_id,
                created_at=datetime.utcnow(),
            )
            self.db.add(ownership_link)

            # 4. Create Source LandRecord Document
            doc_rec = LandRecord(
                record_id=f"REC-{uuid.uuid4().hex[:8].upper()}",
                parcel_id=parcel.id,
                import_session_id=import_session.id,
                record_type="KHASRA_RECORD",
                source=req.source_name,
                document_reference=f"DOC-{r['survey_number']}-HARIPURA",
                record_date=datetime.utcnow(),
                effective_date=datetime.utcnow(),
                imported_at=datetime.utcnow(),
                checksum=checksum,
                metadata_json={"import_source": source_type, "village": r.get("village", "Haripura")},
            )
            self.db.add(doc_rec)

            # 5. Create Baseline 1998 CadastralVersion
            cad_ver = CadastralVersion(
                parcel_id=parcel.id,
                version_number="1998_CADASTRAL",
                geometry=r["cadastral_geometry"],
                source="Rajasthan Settlement Survey 1998",
                effective_date=datetime(1998, 4, 1),
                captured_date=datetime(1998, 4, 1),
                area_m2=r["official_area_m2"],
                created_by="SETTLEMENT_OFFICER",
                change_reason="Official Revenue Settlement Baseline",
                created_at=datetime.utcnow(),
            )
            self.db.add(cad_ver)

            successful += 1

        import_session.successful_records = successful
        import_session.duplicate_records = duplicates
        import_session.status = "COMPLETED"
        import_session.completed_at = datetime.utcnow()

        self.db.commit()

        return ImportSessionDetailResponse(
            id=import_session.id,
            session_id=import_session.session_id,
            source_name=import_session.source_name,
            source_type=import_session.source_type,
            filename=import_session.filename,
            checksum=import_session.checksum,
            total_records=import_session.total_records,
            successful_records=import_session.successful_records,
            failed_records=import_session.failed_records,
            duplicate_records=import_session.duplicate_records,
            validation_errors_json=import_session.validation_errors_json,
            status=import_session.status,
            imported_by=import_session.imported_by,
            created_at=import_session.created_at,
            completed_at=import_session.completed_at,
        )

    def list_import_sessions(self) -> List[ImportSessionResponse]:
        sessions = self.db.query(LandRecordImportSession).order_by(LandRecordImportSession.id.desc()).all()
        return [
            ImportSessionResponse(
                id=s.id,
                session_id=s.session_id,
                source_name=s.source_name,
                source_type=s.source_type,
                filename=s.filename,
                checksum=s.checksum,
                total_records=s.total_records,
                successful_records=s.successful_records,
                failed_records=s.failed_records,
                duplicate_records=s.duplicate_records,
                status=s.status,
                imported_by=s.imported_by,
                created_at=s.created_at,
                completed_at=s.completed_at,
            )
            for s in sessions
        ]

    def get_import_session_detail(self, session_id: str) -> Optional[ImportSessionDetailResponse]:
        s = self.db.query(LandRecordImportSession).filter(LandRecordImportSession.session_id == session_id).first()
        if not s:
            return None
        return ImportSessionDetailResponse(
            id=s.id,
            session_id=s.session_id,
            source_name=s.source_name,
            source_type=s.source_type,
            filename=s.filename,
            checksum=s.checksum,
            total_records=s.total_records,
            successful_records=s.successful_records,
            failed_records=s.failed_records,
            duplicate_records=s.duplicate_records,
            validation_errors_json=s.validation_errors_json or [],
            status=s.status,
            imported_by=s.imported_by,
            created_at=s.created_at,
            completed_at=s.completed_at,
        )
