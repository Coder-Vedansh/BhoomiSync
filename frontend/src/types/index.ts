export type SurveyStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type DatasetType =
  | 'IMAGE'
  | 'LIDAR'
  | 'RTK'
  | 'TELEMETRY'
  | 'METADATA'
  | 'ORTHOMOSAIC'
  | 'DEM'
  | 'DSM'
  | 'PARCEL'
  | 'AI_RESULT'
  | 'COMPARISON_RESULT';

export type DatasetSource =
  | 'DRONE_ACQUISITION'
  | 'PROCESSING_PIPELINE'
  | 'AI_INFERENCE'
  | 'MANUAL_GIS'
  | 'HISTORICAL_RECORD';

export type DatasetStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export type LandUseType =
  | 'AGRICULTURAL_CROP'
  | 'AGRICULTURAL_FALLOW'
  | 'ORCHARD_PLANTATION'
  | 'WATER_BODY'
  | 'RESIDENTIAL_SETTLEMENT'
  | 'RURAL_ROAD'
  | 'BARREN_LAND'
  | 'UNCLASSIFIED';

export type VerificationStatus = 'AI_DETECTED' | 'AUTO_DETECTED' | 'MANUALLY_EDITED' | 'FIELD_VERIFIED' | 'VERIFIED';

export type SensorType = 'CAMERA' | 'LIDAR' | 'RTK_GPS' | 'IMU' | 'MULTISPECTRAL' | 'THERMAL' | 'OTHER';

export type SessionStatus = 'CREATED' | 'UPLOADING' | 'PARTIAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type FileStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'VALIDATED' | 'QUEUED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export type JobType =
  | 'IMAGE_PREPROCESSING'
  | 'LIDAR_PREPROCESSING'
  | 'GEOREFERENCING'
  | 'GNSS_PROCESSING'
  | 'IMAGE_GEOREFERENCING'
  | 'LIDAR_GEOREFERENCING'
  | 'IMAGE_LIDAR_ALIGNMENT'
  | 'IMAGE_LIDAR_FUSION'
  | 'ORTHOMOSAIC_GENERATION'
  | 'DEM_GENERATION'
  | 'DSM_GENERATION'
  | 'BOUNDARY_DETECTION'
  | 'LAND_CLASSIFICATION'
  | 'CHANGE_DETECTION'
  | 'AREA_CALCULATION';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Survey {
  id: number;
  survey_id: string;
  name: string;
  location: string;
  district?: string;
  state?: string;
  status: SurveyStatus;
  survey_date: string;
  center_latitude: number;
  center_longitude: number;
  total_area_hectares: number;
  dataset_count: number;
  parcel_count: number;
  boundary_geojson?: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetFile {
  id: number;
  file_id: string;
  dataset_id: number;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  checksum: string;
  storage_provider: string;
  storage_key: string;
  capture_timestamp?: string;
  processing_status: string;
  created_at: string;
}

export interface Dataset {
  id: number;
  dataset_id: string;
  survey_id: number;
  parent_dataset_id?: number;
  dataset_type: DatasetType;
  source: DatasetSource;
  status: DatasetStatus;
  is_immutable: boolean;
  metadata_json: Record<string, any>;
  description?: string;
  file_count: number;
  total_size_bytes: number;
  created_at: string;
  updated_at: string;
  files?: DatasetFile[];
}

export interface Parcel {
  id: number;
  parcel_id: string;
  survey_id: number;
  dataset_id?: number;
  geometry_geojson: {
    type: string;
    coordinates: any;
  };
  crs?: string;
  area_m2: number;
  area_hectares: number;
  perimeter_m: number;
  centroid_lat: number;
  centroid_lon: number;
  surface_area_m2?: number;
  surface_area_hectares?: number;
  slope_degrees?: number;
  elevation_min_m?: number;
  elevation_max_m?: number;
  land_use: LandUseType;
  source: string;
  confidence: number;
  verification_status: VerificationStatus;
  version: number;
  attributes_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DetectedBoundary {
  boundary_id: string;
  survey_id: string;
  confidence_score: number;
  detection_method: string;
  source_dataset: string;
  status: string;
  geometry_geojson: any;
  estimated_area_m2: number;
  estimated_slope_deg: number;
}

export interface OrthomosaicManifest {
  orthomosaic_id: string;
  survey_id: string;
  status: string;
  crs: string;
  projected_crs: string;
  ground_sampling_distance_cm: number;
  dimensions_px: { width: number; height: number };
  dimensions_m: { width_m: number; height_m: number; total_area_m2: number; total_area_ha: number };
  spatial_bounds: { min_lon: number; max_lon: number; min_lat: number; max_lat: number };
  bounds_leaflet: [number, number][];
  raster_layer_url: string;
  multiband_channels: string[];
  total_source_images: number;
}

export interface DemManifest {
  dem_id: string;
  survey_id: string;
  product_type: string;
  crs: string;
  vertical_datum: string;
  grid_resolution_m: number;
  elevation_range: { min_m: number; max_m: number; mean_m?: number; span_m?: number };
  spatial_bounds: { min_lon: number; max_lon: number; min_lat: number; max_lat: number };
  bounds_leaflet: [number, number][];
  raster_layer_url: string;
  slope_analysis?: { mean_slope_deg: number; max_slope_deg: number; terrain_classification: string };
  color_ramp?: { palette: string; min_color: string; mid_color: string; max_color: string };
}

export interface DsmManifest {
  dsm_id: string;
  survey_id: string;
  product_type: string;
  crs: string;
  vertical_datum: string;
  grid_resolution_m: number;
  elevation_range: { min_m: number; max_m: number; canopy_height_max_m?: number };
  spatial_bounds: { min_lon: number; max_lon: number; min_lat: number; max_lat: number };
  bounds_leaflet: [number, number][];
  raster_layer_url: string;
}

export interface PointCloudSummary {
  total_points: number;
  ground_points: number;
  non_ground_points: number;
  ground_ratio_percentage: number;
  point_density_pts_per_m2: number;
  elevation_stats: {
    min_elevation_m: number;
    max_elevation_m: number;
    elevation_span_m: number;
    mean_elevation_m: number;
    vertical_accuracy_est_cm: number;
  };
  bounding_box_3d: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    min_z: number;
    max_z: number;
  };
  crs: string;
  quality_grade: string;
}

export interface SpatialLayerItem {
  id: string;
  name: string;
  layer_type: 'RASTER' | 'VECTOR_POLYGON' | 'VECTOR_POINTS' | 'VECTOR_LINES' | 'HEATMAP';
  category: string;
  is_visible_by_default: boolean;
  opacity: number;
  z_index: number;
  source_url?: string;
  feature_count?: number;
  crs?: string;
}

export interface PipelineStageStatus {
  stage_id: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  description: string;
  output_dataset_id?: string;
}

export interface GeospatialPipelineStatus {
  survey_id: string;
  overall_status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  stages: PipelineStageStatus[];
  last_updated: string;
}

export interface ParcelMeasurementData {
  parcel_id: string;
  survey_id: string;
  planar_area: {
    square_meters: number;
    hectares: number;
    acres: number;
    square_feet: number;
  };
  surface_area_3d: {
    square_meters: number;
    hectares: number;
    acres: number;
    terrain_expansion_percentage: number;
  };
  perimeter: {
    meters: number;
    centimeters: number;
    kilometers: number;
  };
  terrain_profile: {
    mean_slope_degrees: number;
    elevation_min_m: number;
    elevation_max_m: number;
    elevation_span_m: number;
  };
  centroid: {
    latitude: number;
    longitude: number;
  };
  bounding_box: number[];
  verification_status: string;
  crs: string;
}

export interface LineageGraph {
  survey_id: string;
  nodes: {
    id: number;
    dataset_id: string;
    dataset_type: DatasetType;
    source: DatasetSource;
    status: DatasetStatus;
  }[];
  edges: {
    source_dataset_id: string;
    derived_dataset_id: string;
    transformation_type: string;
  }[];
}

export interface Sensor {
  id: number;
  sensor_id: string;
  name: string;
  sensor_type: SensorType;
  model?: string;
  serial_number?: string;
  specifications_json: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface UploadSession {
  id: number;
  session_id: string;
  survey_id: number;
  device_id: string;
  gateway_type: string;
  status: SessionStatus;
  start_time: string;
  end_time?: string;
  total_files: number;
  uploaded_files: number;
  failed_files: number;
  total_bytes: number;
  uploaded_bytes: number;
  progress_percentage?: number;
  meta_info: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: number;
  file_id: string;
  session_id?: number;
  survey_id: number;
  dataset_id?: number;
  sensor_id?: number;
  filename: string;
  file_format: string;
  file_size_bytes: number;
  mime_type: string;
  checksum_sha256: string;
  storage_provider: string;
  storage_key: string;
  is_duplicate: boolean;
  duplicate_of_file_id?: string;
  upload_status: FileStatus;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gps_accuracy?: number;
  rtk_fix_status?: string;
  satellite_count?: number;
  capture_timestamp?: string;
  exif_metadata_json?: Record<string, any>;
  lidar_metadata_json?: Record<string, any>;
  created_at: string;
}

export interface ProcessingJob {
  id?: number;
  job_id: string;
  job_type: JobType;
  file_id?: number;
  dataset_id?: number;
  survey_id: number | string;
  status: JobStatus;
  progress_percentage: number;
  error_message?: string;
  parameters_json: Record<string, any>;
  result_json: Record<string, any>;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface SpatialFootprint {
  survey_id: string;
  total_images_mapped: number;
  total_lidar_files: number;
  total_rtk_track_points: number;
  camera_points_geojson: any;
  lidar_footprint_geojson: any;
  rtk_trajectory_geojson: any;
  crs: string;
}

export interface SystemHealth {
  status: string;
  version: string;
  environment: string;
  database: string;
  storage_provider: string;
  gateway_type: string;
  timestamp: string;
}

export interface AIModule {
  id?: string;
  module_id: string;
  name: string;
  version: string;
  type?: string;
  status: string;
  description: string;
  accuracy?: number;
  accuracy_f1?: number;
  inputs?: string[];
  supported_inputs?: string[];
  outputs?: string[];
}

export interface ComparisonReport {
  survey_id: string;
  historical_survey_ref?: string;
  historical_survey_name: string;
  current_survey_name: string;
  comparison_date: string;
  total_parcels_compared?: number;
  encroachment_alerts_count?: number;
  average_area_drift_percentage?: number;
  metrics: {
    total_parcels: number;
    total_historical_area_ha: number;
    total_current_area_ha: number;
    area_drift_ha: number;
    mean_iou_overlap: number;
  };
  discrepancy_summary: {
    total_parcels: number;
    boundary_mismatches: number;
    area_changes: number;
    encroachments_detected: number;
  };
  comparisons: Array<{
    parcel_id: string;
    historical_area_m2: number;
    current_area_m2: number;
    area_difference_m2: number;
    area_change_percentage: number;
    iou_overlap: number;
    land_use_changed: boolean;
    historical_land_use: string;
    current_land_use: string;
    audit_status: string;
    status?: string;
  }>;
}

export interface GISStatus {
  spatial_engine: string;
  default_crs: string;
  supported_projections: string[];
  supported_crs?: string[];
  geodesic_algorithm: string;
  timestamp: string;
}

export interface AIModelRecord {
  model_id: string;
  model_name: string;
  model_type: string;
  version: string;
  framework: string;
  classes: string[];
  input_requirements: string[];
  sensor_requirements: string[];
  status: string;
  created_at?: string;
}

export interface AIClassificationRegion {
  result_id?: string;
  class: string;
  confidence: number;
  area_m2: number;
  area_hectares: number;
  percentage: number;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  crs?: string;
  source_dataset_id?: string;
  model_version?: string;
}

export interface AIBoundaryCandidate {
  boundary_id: string;
  boundary_type: string;
  confidence: number;
  confidence_tier?: string;
  sources: string[];
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  crs?: string;
  length_m: number;
  estimated_area_m2: number;
  verification_status: 'CANDIDATE' | 'VERIFIED' | 'REJECTED' | 'MANUALLY_EDITED';
  surveyor_comment?: string;
  created_at?: string;
  verified_at?: string;
}

export interface AIHistoricalChange {
  change_id: string;
  change_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_ENCROACHMENT';
  old_value: string;
  new_value: string;
  area_affected_m2: number;
  percentage_change: number;
  confidence: number;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  crs?: string;
  historical_dataset_id?: string;
  current_dataset_id?: string;
  audit_status: string;
}

export interface AISurveySummary {
  survey_id: string;
  total_classifications: number;
  total_candidate_boundaries: number;
  total_changes_detected: number;
  potential_encroachments: number;
  active_models_count: number;
  overall_health: string;
}

// =============================================================================
// PROMPT 5: Land Records, Ownership & Cadastral Intelligence Types
// =============================================================================

export type UserRole = 'PUBLIC' | 'SURVEYOR' | 'ADMIN';

export interface LandParcelDTO {
  id: number;
  parcel_id: string;
  survey_id?: number;
  survey_number: string;
  subdivision_number?: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  land_record_source?: string;
  official_area_m2: number;
  official_area_hectares: number;
  drone_measured_area_m2?: number;
  verified_area_m2?: number;
  historical_area_m2?: number;
  cadastral_geometry: {
    type: string;
    coordinates: any;
  };
  current_geometry?: {
    type: string;
    coordinates: any;
  };
  verified_geometry?: {
    type: string;
    coordinates: any;
  };
  geometry_source?: string;
  land_status?: string;
  land_use: string;
  ai_detected_land_use?: string;
  classification_confidence: number;
  ownership_status: string;
  primary_owner_name?: string;
  owner_reference?: string;
  owner_masked_reference?: string;
  owners_count?: number;
  record_status?: string;
  verification_status: 'PENDING' | 'AUTO_MATCHED' | 'SURVEYOR_VERIFIED' | 'DISPUTED' | 'REJECTED';
  match_status: 'MATCHED' | 'POSSIBLE_MATCH' | 'NO_MATCH' | 'CONFLICT';
  match_confidence?: number;
  area_difference_m2?: number;
  area_difference_percentage?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  owners?: Array<{
    owner_id: string;
    owner_reference: string;
    name: string;
    ownership_type: string;
    ownership_percentage: number;
    contact_reference?: string;
  }>;
  documents_count?: number;
  change_records_count?: number;
}

export interface AreaUnitsDTO {
  sq_meters: number;
  hectares: number;
  acres: number;
}

export interface ParcelComparisonDTO {
  parcel_id: string;
  survey_number: string;
  village: string;
  official_area: AreaUnitsDTO;
  drone_area?: AreaUnitsDTO;
  historical_area?: AreaUnitsDTO;
  verified_area?: AreaUnitsDTO;
  area_difference_m2?: number;
  percentage_difference?: number;
  perimeter_official_m?: number;
  perimeter_drone_m?: number;
  perimeter_difference_m?: number;
  boundary_displacement_max_m?: number;
  centroid_displacement_m?: number;
  overlap_percentage?: number;
  classification_status: string;
  explanation: string;
}

export interface CadastralVersionDTO {
  id: number;
  version_number: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  source: string;
  effective_date: string;
  captured_date?: string;
  area_m2: number;
  area_hectares: number;
  created_by: string;
  change_reason?: string;
}

export interface ParcelChangeRecordDTO {
  id: number;
  change_record_id: string;
  parcel_id: number;
  change_type: string;
  severity: string;
  old_geometry?: any;
  new_geometry?: any;
  area_difference_m2: number;
  boundary_shift_m: number;
  confidence: number;
  detection_job_id?: string;
  verification_status: string;
  surveyor_comment?: string;
  created_at: string;
}

export interface ParcelDocumentDTO {
  id: number;
  document_id: string;
  parcel_id: number;
  title: string;
  document_type: string;
  file_format: string;
  storage_path: string;
  file_size_bytes: number;
  checksum?: string;
  source: string;
  upload_date: string;
  metadata_json?: Record<string, any>;
}

export interface ImportSessionDTO {
  id: number;
  session_id: string;
  source_name: string;
  source_type: string;
  filename?: string;
  checksum?: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  status: string;
  imported_by: string;
  created_at: string;
  completed_at?: string;
}


