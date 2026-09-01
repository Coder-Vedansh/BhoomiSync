from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ProcessingStartRequest(BaseModel):
    survey_id: str = Field(..., description="Survey identifier e.g. SUR-2026-001")
    enable_orthomosaic: bool = Field(default=True)
    enable_dem_dsm: bool = Field(default=True)
    enable_boundary_detection: bool = Field(default=True)
    target_gsd_cm: float = Field(default=2.5, description="Target Ground Sampling Distance in cm/pixel")
    target_dem_res_m: float = Field(default=0.5, description="Target DEM resolution in meters")


class ProcessingJobSchema(BaseModel):
    job_id: str
    job_type: str
    survey_id: Optional[str] = None
    status: str
    progress_percentage: float = 0.0
    error_message: Optional[str] = None
    parameters_json: Dict[str, Any] = Field(default_factory=dict)
    result_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PipelineStageStatus(BaseModel):
    stage_id: str
    name: str
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED
    progress_percentage: float = 0.0
    description: str
    output_dataset_id: Optional[str] = None


class GeospatialPipelineStatusResponse(BaseModel):
    survey_id: str
    overall_status: str  # PENDING, RUNNING, COMPLETED, FAILED
    stages: List[PipelineStageStatus]
    last_updated: str


class OrthomosaicResponse(BaseModel):
    orthomosaic_id: str
    survey_id: str
    status: str
    crs: str
    projected_crs: str
    ground_sampling_distance_cm: float
    dimensions_px: Dict[str, int]
    dimensions_m: Dict[str, float]
    spatial_bounds: Dict[str, float]
    bounds_leaflet: List[List[float]]
    raster_layer_url: str
    multiband_channels: List[str]
    total_source_images: int


class DemResponse(BaseModel):
    dem_id: str
    survey_id: str
    product_type: str
    crs: str
    vertical_datum: str
    grid_resolution_m: float
    elevation_range: Dict[str, float]
    spatial_bounds: Dict[str, float]
    bounds_leaflet: List[List[float]]
    raster_layer_url: str
    slope_analysis: Dict[str, Any]
    color_ramp: Dict[str, str]


class DsmResponse(BaseModel):
    dsm_id: str
    survey_id: str
    product_type: str
    crs: str
    vertical_datum: str
    grid_resolution_m: float
    elevation_range: Dict[str, float]
    spatial_bounds: Dict[str, float]
    bounds_leaflet: List[List[float]]
    raster_layer_url: str


class PointCloudSummaryResponse(BaseModel):
    total_points: int
    ground_points: int
    non_ground_points: int
    ground_ratio_percentage: float
    point_density_pts_per_m2: float
    elevation_stats: Dict[str, Any]
    bounding_box_3d: Dict[str, float]
    crs: str
    quality_grade: str


class DetectedBoundaryResponse(BaseModel):
    boundary_id: str
    survey_id: str
    confidence_score: float
    detection_method: str
    source_dataset: str
    status: str
    geometry_geojson: Dict[str, Any]
    estimated_area_m2: float
    estimated_slope_deg: float


class SpatialLayerItem(BaseModel):
    id: str
    name: str
    layer_type: str  # RASTER, VECTOR_POLYGON, VECTOR_POINTS, VECTOR_LINES, HEATMAP
    category: str
    is_visible_by_default: bool
    opacity: float
    z_index: int
    source_url: Optional[str] = None
    feature_count: Optional[int] = None
    crs: str = "EPSG:4326"


class SpatialLayersManifestResponse(BaseModel):
    survey_id: str
    total_layers: int
    layers: List[SpatialLayerItem]


class ParcelCreateRequest(BaseModel):
    parcel_id: Optional[str] = None
    geometry_geojson: Dict[str, Any]
    land_use: str = "AGRICULTURAL_CROP"
    confidence: float = 1.0
    verification_status: str = "MANUALLY_EDITED"
    slope_degrees: float = 3.5
    attributes_json: Dict[str, Any] = Field(default_factory=dict)


class ParcelUpdateRequest(BaseModel):
    geometry_geojson: Optional[Dict[str, Any]] = None
    land_use: Optional[str] = None
    verification_status: Optional[str] = None
    slope_degrees: Optional[float] = None
    attributes_json: Optional[Dict[str, Any]] = None


class ParcelMeasurementResponse(BaseModel):
    parcel_id: str
    survey_id: str
    planar_area: Dict[str, float]
    surface_area_3d: Dict[str, float]
    perimeter: Dict[str, float]
    terrain_profile: Dict[str, Any]
    centroid: Dict[str, float]
    bounding_box: List[float]
    verification_status: str
    crs: str
