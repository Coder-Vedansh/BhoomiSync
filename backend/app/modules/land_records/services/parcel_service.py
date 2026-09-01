from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from shapely.geometry import shape, Point, box

from app.models.land_records import (
    LandParcel,
    LandOwner,
    ParcelOwnership,
    CadastralVersion,
    ParcelChangeRecord,
    ParcelDocument,
    VerificationStatus,
    MatchStatus,
)
from app.modules.land_records.matching.matcher import ParcelMatchingEngine
from app.modules.land_records.comparison.comparison_engine import ParcelComparisonEngine
from app.modules.land_records.schemas.parcel_schemas import (
    PublicParcelDTO,
    SurveyorParcelDTO,
    AdminParcelDTO,
    ParcelVerificationRequest,
)
from app.modules.land_records.schemas.comparison_schemas import (
    CadastralVersionDTO,
    ParcelChangeRecordDTO,
    ParcelDocumentDTO,
    AreaComparisonResponse,
)


class ParcelService:
    """
    Service Layer managing Land Parcels, Ownership projection with privacy masking,
    spatial queries, and surveyor verification.
    """

    def __init__(self, db: Session):
        self.db = db

    def _mask_name(self, name: str) -> str:
        """Masks owner name for public view (e.g. Ramesh Patel -> R***** P****)."""
        parts = name.split()
        masked = []
        for p in parts:
            if len(p) > 1:
                masked.append(p[0] + "*" * (len(p) - 1))
            else:
                masked.append(p)
        return " ".join(masked)

    def serialize_parcel(self, p: LandParcel, role: str = "SURVEYOR") -> Dict[str, Any]:
        """Serializes LandParcel model into role-appropriate DTO."""
        role_upper = role.upper().strip()

        # Compute area diff if drone area available
        area_diff = None
        area_diff_pct = None
        if p.drone_measured_area_m2 is not None:
            area_diff = round(p.drone_measured_area_m2 - p.official_area_m2, 2)
            area_diff_pct = round((area_diff / p.official_area_m2) * 100.0, 2)

        # Retrieve primary owner name and reference
        primary_owner = p.ownerships[0].owner if p.ownerships else None
        owner_name = primary_owner.name if primary_owner else "Unregistered Khatedar"
        owner_ref = primary_owner.owner_reference if primary_owner else "OWN-REF-UNASSIGNED"

        if role_upper == "PUBLIC":
            return PublicParcelDTO(
                id=p.id,
                parcel_id=p.parcel_id,
                survey_number=p.survey_number,
                subdivision_number=p.subdivision_number,
                village=p.village,
                tehsil=p.tehsil,
                district=p.district,
                state=p.state,
                official_area_m2=p.official_area_m2,
                official_area_hectares=p.official_area_hectares,
                drone_measured_area_m2=p.drone_measured_area_m2,
                verified_area_m2=p.verified_area_m2,
                cadastral_geometry=p.cadastral_geometry,
                current_geometry=p.current_geometry,
                verified_geometry=p.verified_geometry,
                land_use=p.land_use,
                ai_detected_land_use=p.ai_detected_land_use,
                classification_confidence=p.classification_confidence,
                ownership_status=p.ownership_status,
                owner_masked_reference=self._mask_name(owner_name),
                verification_status=p.verification_status,
                match_status=p.match_status,
                created_at=p.created_at,
                updated_at=p.updated_at,
            ).model_dump()

        elif role_upper == "ADMIN":
            owners_list = [
                {
                    "owner_id": po.owner.owner_id,
                    "owner_reference": po.owner.owner_reference,
                    "name": po.owner.name,
                    "ownership_type": po.owner.ownership_type.value if hasattr(po.owner.ownership_type, "value") else str(po.owner.ownership_type),
                    "ownership_percentage": po.ownership_percentage,
                    "contact_reference": po.owner.contact_reference,
                }
                for po in p.ownerships
            ]
            return AdminParcelDTO(
                id=p.id,
                parcel_id=p.parcel_id,
                survey_id=p.survey_id,
                survey_number=p.survey_number,
                subdivision_number=p.subdivision_number,
                village=p.village,
                tehsil=p.tehsil,
                district=p.district,
                state=p.state,
                land_record_source=p.land_record_source,
                official_area_m2=p.official_area_m2,
                official_area_hectares=p.official_area_hectares,
                drone_measured_area_m2=p.drone_measured_area_m2,
                verified_area_m2=p.verified_area_m2,
                historical_area_m2=p.historical_area_m2,
                cadastral_geometry=p.cadastral_geometry,
                current_geometry=p.current_geometry,
                verified_geometry=p.verified_geometry,
                geometry_source=p.geometry_source,
                land_status=p.land_status,
                land_use=p.land_use,
                ai_detected_land_use=p.ai_detected_land_use,
                classification_confidence=p.classification_confidence,
                ownership_status=p.ownership_status,
                primary_owner_name=owner_name,
                owner_reference=owner_ref,
                owners_count=len(p.ownerships),
                record_status=p.record_status,
                verification_status=p.verification_status,
                match_status=p.match_status,
                match_confidence=p.match_confidence,
                area_difference_m2=area_diff,
                area_difference_percentage=area_diff_pct,
                notes=p.notes,
                created_at=p.created_at,
                updated_at=p.updated_at,
                owners=owners_list,
                documents_count=len(p.documents),
                change_records_count=len(p.change_records),
            ).model_dump()

        else:  # Default: SURVEYOR
            return SurveyorParcelDTO(
                id=p.id,
                parcel_id=p.parcel_id,
                survey_id=p.survey_id,
                survey_number=p.survey_number,
                subdivision_number=p.subdivision_number,
                village=p.village,
                tehsil=p.tehsil,
                district=p.district,
                state=p.state,
                land_record_source=p.land_record_source,
                official_area_m2=p.official_area_m2,
                official_area_hectares=p.official_area_hectares,
                drone_measured_area_m2=p.drone_measured_area_m2,
                verified_area_m2=p.verified_area_m2,
                historical_area_m2=p.historical_area_m2,
                cadastral_geometry=p.cadastral_geometry,
                current_geometry=p.current_geometry,
                verified_geometry=p.verified_geometry,
                geometry_source=p.geometry_source,
                land_status=p.land_status,
                land_use=p.land_use,
                ai_detected_land_use=p.ai_detected_land_use,
                classification_confidence=p.classification_confidence,
                ownership_status=p.ownership_status,
                primary_owner_name=owner_name,
                owner_reference=owner_ref,
                owners_count=len(p.ownerships),
                record_status=p.record_status,
                verification_status=p.verification_status,
                match_status=p.match_status,
                match_confidence=p.match_confidence,
                area_difference_m2=area_diff,
                area_difference_percentage=area_diff_pct,
                notes=p.notes,
                created_at=p.created_at,
                updated_at=p.updated_at,
            ).model_dump()

    def get_parcels(
        self,
        role: str = "SURVEYOR",
        village: Optional[str] = None,
        survey_number: Optional[str] = None,
        land_use: Optional[str] = None,
        verification_status: Optional[str] = None,
        change_severity: Optional[str] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Lists parcels with filtering, pagination, and role-based masking."""
        query = self.db.query(LandParcel)

        if village:
            query = query.filter(LandParcel.village.ilike(f"%{village}%"))
        if survey_number:
            query = query.filter(LandParcel.survey_number.ilike(f"%{survey_number}%"))
        if land_use:
            query = query.filter(LandParcel.land_use == land_use.upper())
        if verification_status:
            query = query.filter(LandParcel.verification_status == verification_status)
        if search_query:
            query = query.filter(
                or_(
                    LandParcel.parcel_id.ilike(f"%{search_query}%"),
                    LandParcel.survey_number.ilike(f"%{search_query}%"),
                    LandParcel.village.ilike(f"%{search_query}%"),
                    LandParcel.land_use.ilike(f"%{search_query}%"),
                )
            )

        total = query.count()
        parcels = query.order_by(LandParcel.id.asc()).offset(skip).limit(limit).all()

        return {
            "total": total,
            "parcels": [self.serialize_parcel(p, role) for p in parcels]
        }

    def get_parcel_by_id(self, parcel_id: str, role: str = "SURVEYOR") -> Optional[Dict[str, Any]]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            from app.models.parcel import Parcel
            legacy = self.db.query(Parcel).filter(Parcel.parcel_code == parcel_id).first()
            if legacy:
                return {
                    "id": legacy.id,
                    "parcel_id": legacy.parcel_code,
                    "survey_id": legacy.survey_id,
                    "survey_number": legacy.survey_number,
                    "subdivision_number": "1",
                    "village": "Haripura",
                    "tehsil": "Girwa",
                    "district": "Udaipur",
                    "state": "Rajasthan",
                    "land_record_source": "Revenue Cadastre",
                    "official_area_m2": legacy.area_sq_meters,
                    "official_area_hectares": legacy.area_hectares,
                    "drone_measured_area_m2": legacy.area_sq_meters,
                    "cadastral_geometry": legacy.boundary_geojson,
                    "current_geometry": legacy.boundary_geojson,
                    "verified_geometry": legacy.boundary_geojson,
                    "geometry_source": "REVENUE_CADASTRAL_MAP",
                    "land_status": "ACTIVE",
                    "land_use": legacy.land_use.value if hasattr(legacy.land_use, "value") else str(legacy.land_use),
                    "classification_confidence": 0.95,
                    "ownership_status": "CLEAR_TITLED",
                    "primary_owner_name": legacy.owner_name or "Registered Khatedar",
                    "owner_reference": f"OWN-{legacy.parcel_code}",
                    "owner_masked_reference": self._mask_name(legacy.owner_name or "Registered Khatedar"),
                    "owners_count": 1,
                    "record_status": "OFFICIAL",
                    "verification_status": "SURVEYOR_VERIFIED" if legacy.is_verified else "PENDING",
                    "match_status": "MATCHED",
                    "match_confidence": 0.95,
                    "created_at": legacy.created_at,
                    "updated_at": legacy.updated_at,
                }
            return None
        return self.serialize_parcel(p, role)

    def get_parcel_ownership(self, parcel_id: str, role: str = "SURVEYOR") -> Dict[str, Any]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            return {"error": "Parcel not found"}

        ownerships = []
        for po in p.ownerships:
            owner = po.owner
            if role.upper() == "PUBLIC":
                name_val = self._mask_name(owner.name)
                contact_val = None
            else:
                name_val = owner.name
                contact_val = owner.contact_reference

            ownerships.append({
                "ownership_id": po.id,
                "owner_id": owner.owner_id,
                "owner_reference": owner.owner_reference,
                "name": name_val,
                "ownership_type": owner.ownership_type.value if hasattr(owner.ownership_type, "value") else str(owner.ownership_type),
                "ownership_percentage": po.ownership_percentage,
                "ownership_status": po.ownership_status,
                "ownership_start_date": po.ownership_start_date.isoformat() if po.ownership_start_date else None,
                "contact_reference": contact_val,
                "record_source": owner.record_source,
            })

        return {
            "parcel_id": p.parcel_id,
            "survey_number": p.survey_number,
            "total_owners": len(ownerships),
            "ownership_status": p.ownership_status,
            "owners": ownerships
        }

    def get_parcel_history(self, parcel_id: str) -> Dict[str, Any]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            return {"error": "Parcel not found"}

        versions = [
            CadastralVersionDTO(
                id=v.id,
                version_number=v.version_number,
                geometry=v.geometry,
                source=v.source,
                effective_date=v.effective_date,
                captured_date=v.captured_date,
                area_m2=v.area_m2,
                area_hectares=round(v.area_m2 / 10000.0, 4),
                created_by=v.created_by,
                change_reason=v.change_reason,
            ).model_dump()
            for v in p.cadastral_versions
        ]

        return {
            "parcel_id": p.parcel_id,
            "survey_number": p.survey_number,
            "total_versions": len(versions),
            "versions": versions
        }

    def get_parcel_changes(self, parcel_id: str) -> Dict[str, Any]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            return {"error": "Parcel not found"}

        changes = [
            ParcelChangeRecordDTO(
                id=c.id,
                change_record_id=c.change_record_id,
                parcel_id=c.parcel_id,
                change_type=c.change_type,
                severity=c.severity,
                old_geometry=c.old_geometry,
                new_geometry=c.new_geometry,
                area_difference_m2=c.area_difference_m2,
                boundary_shift_m=c.boundary_shift_m,
                confidence=c.confidence,
                detection_job_id=c.detection_job_id,
                verification_status=c.verification_status,
                surveyor_comment=c.surveyor_comment,
                created_at=c.created_at,
            ).model_dump()
            for c in p.change_records
        ]

        return {
            "parcel_id": p.parcel_id,
            "survey_number": p.survey_number,
            "total_changes": len(changes),
            "changes": changes
        }

    def get_parcel_documents(self, parcel_id: str) -> Dict[str, Any]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            return {"error": "Parcel not found"}

        docs = [
            ParcelDocumentDTO(
                id=d.id,
                document_id=d.document_id,
                parcel_id=d.parcel_id,
                title=d.title,
                document_type=d.document_type,
                file_format=d.file_format,
                storage_path=d.storage_path,
                file_size_bytes=d.file_size_bytes,
                checksum=d.checksum,
                source=d.source,
                upload_date=d.upload_date,
                metadata_json=d.metadata_json,
            ).model_dump()
            for d in p.documents
        ]

        return {
            "parcel_id": p.parcel_id,
            "survey_number": p.survey_number,
            "total_documents": len(docs),
            "documents": docs
        }

    def get_parcel_comparison(self, parcel_id: str) -> AreaComparisonResponse:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            raise ValueError(f"Parcel {parcel_id} not found")

        return ParcelComparisonEngine.compare_parcel(
            parcel_id=p.parcel_id,
            survey_number=p.survey_number,
            village=p.village,
            official_area_m2=p.official_area_m2,
            drone_area_m2=p.drone_measured_area_m2,
            historical_area_m2=p.historical_area_m2,
            verified_area_m2=p.verified_area_m2,
            official_geom=p.cadastral_geometry,
            drone_geom=p.current_geometry,
        )

    def match_parcel(self, parcel_id: str) -> Dict[str, Any]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            raise ValueError(f"Parcel {parcel_id} not found")

        match_res = ParcelMatchingEngine.match_parcel(
            official_geometry=p.cadastral_geometry,
            drone_geometry=p.current_geometry,
            official_survey_no=p.survey_number,
            detected_survey_no=p.survey_number,
            official_area_m2=p.official_area_m2,
            drone_area_m2=p.drone_measured_area_m2,
        )

        p.match_status = match_res["match_status"]
        p.match_confidence = match_res["match_confidence"]
        self.db.commit()

        return {
            "parcel_id": p.parcel_id,
            "survey_number": p.survey_number,
            "match_result": match_res
        }

    def verify_parcel(self, parcel_id: str, req: ParcelVerificationRequest, surveyor_id: str = "SURVEYOR_OFFICIAL") -> Dict[str, Any]:
        p = self.db.query(LandParcel).filter(LandParcel.parcel_id == parcel_id).first()
        if not p:
            raise ValueError(f"Parcel {parcel_id} not found")

        if req.verified_geometry:
            p.verified_geometry = req.verified_geometry
        elif p.current_geometry:
            p.verified_geometry = p.current_geometry
        else:
            p.verified_geometry = p.cadastral_geometry

        if req.verified_area_m2:
            p.verified_area_m2 = req.verified_area_m2
        elif p.drone_measured_area_m2:
            p.verified_area_m2 = p.drone_measured_area_m2
        else:
            p.verified_area_m2 = p.official_area_m2

        p.verification_status = req.status
        p.notes = f"Verified by {surveyor_id}: {req.surveyor_comment}"
        p.updated_at = datetime.utcnow()

        self.db.commit()

        return {
            "success": True,
            "parcel_id": p.parcel_id,
            "verification_status": p.verification_status.value if hasattr(p.verification_status, "value") else str(p.verification_status),
            "verified_area_m2": p.verified_area_m2,
            "message": f"Parcel {p.parcel_id} successfully verified by surveyor"
        }

    def spatial_query(
        self,
        bbox: Optional[List[float]] = None,
        center_lon: Optional[float] = None,
        center_lat: Optional[float] = None,
        radius_meters: Optional[float] = None,
        village: Optional[str] = None,
        survey_number: Optional[str] = None,
        land_use: Optional[str] = None,
        verification_status: Optional[str] = None,
        role: str = "SURVEYOR",
        limit: int = 100
    ) -> Dict[str, Any]:
        """Spatial query with bbox or radius filtering."""
        query = self.db.query(LandParcel)
        if village:
            query = query.filter(LandParcel.village.ilike(f"%{village}%"))
        if survey_number:
            query = query.filter(LandParcel.survey_number.ilike(f"%{survey_number}%"))
        if land_use:
            query = query.filter(LandParcel.land_use == land_use.upper())
        if verification_status:
            query = query.filter(LandParcel.verification_status == verification_status)

        all_parcels = query.limit(limit * 2).all()
        matched = []

        query_poly = None
        if bbox and len(bbox) == 4:
            query_poly = box(bbox[0], bbox[1], bbox[2], bbox[3])
        elif center_lon is not None and center_lat is not None and radius_meters is not None:
            deg = radius_meters / 111320.0
            query_poly = Point(center_lon, center_lat).buffer(deg)

        for p in all_parcels:
            if query_poly:
                try:
                    p_poly = shape(p.cadastral_geometry)
                    if not p_poly.intersects(query_poly):
                        continue
                except Exception:
                    pass

            matched.append(self.serialize_parcel(p, role))
            if len(matched) >= limit:
                break

        return {
            "type": "FeatureCollection",
            "total_features": len(matched),
            "features": [
                {
                    "type": "Feature",
                    "geometry": p["cadastral_geometry"],
                    "properties": p
                }
                for p in matched
            ]
        }

    def get_cadastral_layer_geojson(self, role: str = "SURVEYOR") -> Dict[str, Any]:
        """Returns standard GeoJSON FeatureCollection of all cadastral parcels."""
        parcels = self.db.query(LandParcel).all()
        features = []

        for p in parcels:
            props = self.serialize_parcel(p, role)
            features.append({
                "type": "Feature",
                "geometry": p.cadastral_geometry,
                "properties": props
            })

        return {
            "type": "FeatureCollection",
            "name": "BhoomiSync_Cadastral_Parcels",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
            "features": features
        }
