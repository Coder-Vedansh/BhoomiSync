from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.parcel import (
    Parcel,
    ParcelAuditLog,
    VerificationStatus,
    ParcelAuditAction
)
from app.schemas.parcel import (
    ParcelDetail,
    ParcelUpdateGeometry,
    ParcelUpdateStatus,
    ParcelAuditLogSchema
)
from app.modules.gis.spatial_utils import compute_parcel_metrics_from_geojson
from app.core.exceptions import NotFoundException


class ParcelService:
    def __init__(self, db: Session):
        self.db = db

    def get_parcel_by_code(self, parcel_id: str) -> ParcelDetail:
        parcel = self.db.query(Parcel).filter(Parcel.parcel_id == parcel_id).first()
        if not parcel:
            raise NotFoundException("Parcel", parcel_id)

        return ParcelDetail(
            id=parcel.id,
            parcel_id=parcel.parcel_id,
            survey_id=parcel.survey_id,
            dataset_id=parcel.dataset_id,
            geometry_geojson=parcel.geometry_geojson,
            area_m2=parcel.area_m2,
            area_hectares=round(parcel.area_m2 / 10000.0, 4),
            perimeter_m=parcel.perimeter_m,
            centroid_lat=parcel.centroid_lat,
            centroid_lon=parcel.centroid_lon,
            land_use=parcel.land_use,
            source=parcel.source,
            confidence=parcel.confidence,
            verification_status=parcel.verification_status,
            version=parcel.version,
            attributes_json=parcel.attributes_json or {},
            created_at=parcel.created_at,
            updated_at=parcel.updated_at
        )

    def get_parcel_history(self, parcel_id: str) -> List[ParcelAuditLogSchema]:
        parcel = self.db.query(Parcel).filter(Parcel.parcel_id == parcel_id).first()
        if not parcel:
            raise NotFoundException("Parcel", parcel_id)

        logs = self.db.query(ParcelAuditLog).filter(
            ParcelAuditLog.parcel_id == parcel.id
        ).order_by(ParcelAuditLog.version.desc()).all()

        return [ParcelAuditLogSchema.model_validate(log) for log in logs]

    def update_parcel_geometry(self, parcel_id: str, data: ParcelUpdateGeometry) -> ParcelDetail:
        """
        Applies a manual boundary edit to a parcel, recomputes geodesic metrics,
        increments the version, and records an immutable audit log entry.
        """
        parcel = self.db.query(Parcel).filter(Parcel.parcel_id == parcel_id).first()
        if not parcel:
            raise NotFoundException("Parcel", parcel_id)

        prev_geom = parcel.geometry_geojson
        new_geom = data.new_geometry_geojson

        # Recompute physical geodesic metrics on new geometry
        metrics = compute_parcel_metrics_from_geojson(new_geom)

        new_version = parcel.version + 1
        parcel.geometry_geojson = new_geom
        parcel.area_m2 = metrics["area_m2"]
        parcel.perimeter_m = metrics["perimeter_m"]
        parcel.centroid_lat = metrics["centroid_lat"]
        parcel.centroid_lon = metrics["centroid_lon"]
        parcel.version = new_version
        parcel.verification_status = VerificationStatus.MANUALLY_EDITED
        parcel.updated_at = datetime.utcnow()

        # Create audit log
        audit = ParcelAuditLog(
            parcel_id=parcel.id,
            version=new_version,
            action=ParcelAuditAction.BOUNDARY_EDITED,
            previous_geometry_geojson=prev_geom,
            new_geometry_geojson=new_geom,
            editor_id=data.editor_id,
            comment=data.comment or "Manual boundary vertex update",
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(parcel)

        return self.get_parcel_by_code(parcel.parcel_id)

    def update_verification_status(self, parcel_id: str, data: ParcelUpdateStatus) -> ParcelDetail:
        parcel = self.db.query(Parcel).filter(Parcel.parcel_id == parcel_id).first()
        if not parcel:
            raise NotFoundException("Parcel", parcel_id)

        parcel.verification_status = data.verification_status
        parcel.updated_at = datetime.utcnow()

        audit = ParcelAuditLog(
            parcel_id=parcel.id,
            version=parcel.version,
            action=ParcelAuditAction.STATUS_CHANGED,
            previous_geometry_geojson=parcel.geometry_geojson,
            new_geometry_geojson=parcel.geometry_geojson,
            editor_id=data.editor_id,
            comment=data.comment or f"Status updated to {data.verification_status.value}",
            timestamp=datetime.utcnow()
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(parcel)

        return self.get_parcel_by_code(parcel.parcel_id)
