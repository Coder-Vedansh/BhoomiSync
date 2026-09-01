from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.survey import Survey, SurveyStatus
from app.models.dataset import Dataset, DatasetFile, DatasetLineage
from app.models.parcel import Parcel
from app.schemas.survey import SurveyCreate, SurveySummary, SurveyDetail
from app.schemas.dataset import DatasetSummary, SurveyLineageGraph, LineageNode, LineageEdge
from app.schemas.parcel import ParcelDetail
from app.core.exceptions import NotFoundException, DuplicateResourceException


class SurveyService:
    def __init__(self, db: Session):
        self.db = db

    def list_surveys(self, skip: int = 0, limit: int = 50) -> Tuple[List[SurveySummary], int]:
        total = self.db.query(func.count(Survey.id)).scalar()
        surveys = self.db.query(Survey).offset(skip).limit(limit).all()
        
        summaries = []
        for s in surveys:
            d_count = self.db.query(func.count(Dataset.id)).filter(Dataset.survey_id == s.id).scalar()
            p_count = self.db.query(func.count(Parcel.id)).filter(Parcel.survey_id == s.id).scalar()
            
            summary = SurveySummary(
                id=s.id,
                survey_id=s.survey_id,
                name=s.name,
                location=s.location,
                district=s.district,
                state=s.state,
                status=s.status,
                survey_date=s.survey_date,
                center_latitude=s.center_latitude,
                center_longitude=s.center_longitude,
                total_area_hectares=s.total_area_hectares or 0.0,
                dataset_count=d_count or 0,
                parcel_count=p_count or 0,
                created_at=s.created_at,
                updated_at=s.updated_at
            )
            summaries.append(summary)
        return summaries, total

    def get_survey_by_code(self, survey_id: str) -> SurveyDetail:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException("Survey", survey_id)
            
        d_count = self.db.query(func.count(Dataset.id)).filter(Dataset.survey_id == survey.id).scalar()
        p_count = self.db.query(func.count(Parcel.id)).filter(Parcel.survey_id == survey.id).scalar()

        return SurveyDetail(
            id=survey.id,
            survey_id=survey.survey_id,
            name=survey.name,
            location=survey.location,
            district=survey.district,
            state=survey.state,
            status=survey.status,
            survey_date=survey.survey_date,
            center_latitude=survey.center_latitude,
            center_longitude=survey.center_longitude,
            total_area_hectares=survey.total_area_hectares or 0.0,
            dataset_count=d_count or 0,
            parcel_count=p_count or 0,
            boundary_geojson=survey.boundary_geojson,
            description=survey.description,
            created_at=survey.created_at,
            updated_at=survey.updated_at
        )

    def create_survey(self, data: SurveyCreate) -> SurveyDetail:
        if data.survey_id:
            existing = self.db.query(Survey).filter(Survey.survey_id == data.survey_id).first()
            if existing:
                raise DuplicateResourceException("Survey", data.survey_id)
        else:
            count = self.db.query(func.count(Survey.id)).scalar() or 0
            data.survey_id = f"SUR-2026-{str(count + 1).zfill(3)}"

        survey = Survey(
            survey_id=data.survey_id,
            name=data.name,
            location=data.location,
            district=data.district,
            state=data.state,
            status=data.status,
            survey_date=data.survey_date,
            center_latitude=data.center_latitude,
            center_longitude=data.center_longitude,
            boundary_geojson=data.boundary_geojson,
            total_area_hectares=data.total_area_hectares or 0.0,
            description=data.description
        )
        self.db.add(survey)
        self.db.commit()
        self.db.refresh(survey)
        return self.get_survey_by_code(survey.survey_id)

    def get_survey_datasets(self, survey_id: str) -> List[DatasetSummary]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException("Survey", survey_id)

        datasets = self.db.query(Dataset).filter(Dataset.survey_id == survey.id).all()
        summaries = []
        for d in datasets:
            file_count = self.db.query(func.count(DatasetFile.id)).filter(DatasetFile.dataset_id == d.id).scalar() or 0
            size_bytes = self.db.query(func.sum(DatasetFile.file_size_bytes)).filter(DatasetFile.dataset_id == d.id).scalar() or 0
            summaries.append(
                DatasetSummary(
                    id=d.id,
                    dataset_id=d.dataset_id,
                    survey_id=d.survey_id,
                    parent_dataset_id=d.parent_dataset_id,
                    dataset_type=d.dataset_type,
                    source=d.source,
                    status=d.status,
                    is_immutable=d.is_immutable,
                    metadata_json=d.metadata_json or {},
                    description=d.description,
                    file_count=file_count,
                    total_size_bytes=size_bytes,
                    created_at=d.created_at,
                    updated_at=d.updated_at
                )
            )
        return summaries

    def get_survey_parcels(self, survey_id: str) -> List[ParcelDetail]:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException("Survey", survey_id)

        parcels = self.db.query(Parcel).filter(Parcel.survey_id == survey.id).all()
        results = []
        for p in parcels:
            results.append(
                ParcelDetail(
                    id=p.id,
                    parcel_id=p.parcel_id,
                    survey_id=p.survey_id,
                    dataset_id=p.dataset_id,
                    geometry_geojson=p.geometry_geojson,
                    area_m2=p.area_m2,
                    area_hectares=round(p.area_m2 / 10000.0, 4),
                    perimeter_m=p.perimeter_m,
                    centroid_lat=p.centroid_lat,
                    centroid_lon=p.centroid_lon,
                    land_use=p.land_use,
                    source=p.source,
                    confidence=p.confidence,
                    verification_status=p.verification_status,
                    version=p.version,
                    attributes_json=p.attributes_json or {},
                    created_at=p.created_at,
                    updated_at=p.updated_at
                )
            )
        return results

    def get_survey_lineage(self, survey_id: str) -> SurveyLineageGraph:
        survey = self.db.query(Survey).filter(Survey.survey_id == survey_id).first()
        if not survey:
            raise NotFoundException("Survey", survey_id)

        datasets = self.db.query(Dataset).filter(Dataset.survey_id == survey.id).all()
        dataset_ids = [d.id for d in datasets]
        dataset_map = {d.id: d for d in datasets}

        nodes = [
            LineageNode(
                id=d.id,
                dataset_id=d.dataset_id,
                dataset_type=d.dataset_type,
                source=d.source,
                status=d.status
            )
            for d in datasets
        ]

        edges = []
        # Query lineage edges
        if dataset_ids:
            lineages = self.db.query(DatasetLineage).filter(
                DatasetLineage.source_dataset_id.in_(dataset_ids)
            ).all()
            for edge in lineages:
                src = dataset_map.get(edge.source_dataset_id)
                dst = dataset_map.get(edge.derived_dataset_id)
                if src and dst:
                    edges.append(
                        LineageEdge(
                            source_dataset_id=src.dataset_id,
                            derived_dataset_id=dst.dataset_id,
                            transformation_type=edge.transformation_type
                        )
                    )

        return SurveyLineageGraph(
            survey_id=survey_id,
            nodes=nodes,
            edges=edges
        )
