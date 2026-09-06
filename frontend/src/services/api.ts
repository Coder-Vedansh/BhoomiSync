import {
  Survey,
  Dataset,
  DatasetFile,
  Parcel,
  LineageGraph,
  GISStatus,
  Sensor,
  UploadSession,
  UploadedFile,
  ProcessingJob,
  SpatialFootprint,
  OrthomosaicManifest,
  DemManifest,
  DsmManifest,
  PointCloudSummary,
  SpatialLayerItem,
  DetectedBoundary,
  GeospatialPipelineStatus,
  ParcelMeasurementData,
  AIModule,
  ComparisonReport,
  SystemHealth,
  AIModelRecord,
  AISurveySummary,
  AIClassificationRegion,
  AIBoundaryCandidate,
  AIHistoricalChange,
} from '../types';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, any>;
}

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();
  if (!json.success || !res.ok) {
    throw new Error(json.error?.message || `HTTP error ${res.status}`);
  }
  return json.data;
}

export const api = {
  // System Health
  getHealth: () => fetchJson<SystemHealth>('/health'),

  // Surveys
  getSurveys: () => fetchJson<Survey[]>('/surveys'),
  getSurvey: (surveyId: string) => fetchJson<Survey>(`/surveys/${surveyId}`),
  createSurvey: (data: Partial<Survey>) =>
    fetchJson<Survey>('/surveys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSurveyDatasets: (surveyId: string) =>
    fetchJson<Dataset[]>(`/surveys/${surveyId}/datasets`),
  getSurveyParcels: (surveyId: string) =>
    fetchJson<Parcel[]>(`/surveys/${surveyId}/parcels`),
  getSurveyLineage: (surveyId: string) =>
    fetchJson<LineageGraph>(`/surveys/${surveyId}/lineage`),

  // Datasets
  getDataset: (datasetId: string) => fetchJson<Dataset>(`/datasets/${datasetId}`),
  getDatasetFiles: (datasetId: string) =>
    fetchJson<DatasetFile[]>(`/datasets/${datasetId}/files`),

  // Parcels
  getParcel: (parcelId: string) => fetchJson<Parcel>(`/parcels/${parcelId}`),
  updateParcelStatus: (parcelId: string, status: string, comment?: string) =>
    fetchJson<Parcel>(`/parcels/${parcelId}`, {
      method: 'PUT',
      body: JSON.stringify({ verification_status: status, comment }),
    }),
  createParcel: (surveyId: string, data: any) =>
    fetchJson<Parcel>(`/surveys/${surveyId}/parcels`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateParcelGeometry: (parcelId: string, data: any) =>
    fetchJson<Parcel>(`/parcels/${parcelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteParcel: (parcelId: string) =>
    fetchJson<{ parcel_id: string; deleted: boolean }>(`/parcels/${parcelId}`, {
      method: 'DELETE',
    }),
  getParcelMeasurements: (parcelId: string) =>
    fetchJson<ParcelMeasurementData>(`/parcels/${parcelId}/measurements`),

  // AI Modules
  getAiModules: () =>
    fetchJson<{ total_modules: number; modules: AIModule[] }>('/ai/modules'),
  runLandClassification: (surveyId: string, datasetId: string) =>
    fetchJson<any>('/ai/land-classification/run', {
      method: 'POST',
      body: JSON.stringify({ survey_id: surveyId, dataset_id: datasetId }),
    }),
  runParcelBoundaryDetection: (surveyId: string, datasetId: string) =>
    fetchJson<any>('/ai/parcel-boundary/run', {
      method: 'POST',
      body: JSON.stringify({ survey_id: surveyId, dataset_id: datasetId }),
    }),
  runChangeDetection: (surveyId: string, histId: string, currId: string) =>
    fetchJson<any>('/ai/change-detection/run', {
      method: 'POST',
      body: JSON.stringify({
        survey_id: surveyId,
        historical_dataset_id: histId,
        current_dataset_id: currId,
      }),
    }),

  // Comparison
  getComparisonStatus: () => fetchJson<any>('/comparison/status'),
  getSurveyComparison: (surveyId: string) =>
    fetchJson<ComparisonReport>(`/comparison/surveys/${surveyId}`),

  // GIS Engine Status
  getGisStatus: () => fetchJson<GISStatus>('/gis/status'),

  // ---------------------------------------------------------------------------
  // Drone Ingestion & Cloud Storage Services
  // ---------------------------------------------------------------------------
  getSensors: () => fetchJson<Sensor[]>('/sensors'),

  getUploadSessions: (surveyId: string) =>
    fetchJson<UploadSession[]>(`/surveys/${surveyId}/upload-sessions`),

  getUploadSession: (sessionId: string) =>
    fetchJson<UploadSession>(`/upload-sessions/${sessionId}`),

  createUploadSession: (surveyId: string, data: any) =>
    fetchJson<UploadSession>(`/surveys/${surveyId}/upload-sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeUploadSession: (sessionId: string) =>
    fetchJson<UploadSession>(`/upload-sessions/${sessionId}/complete`, {
      method: 'POST',
    }),

  uploadSurveyFile: async (surveyId: string, formData: FormData): Promise<UploadedFile> => {
    const res = await fetch(`${API_BASE}/surveys/${surveyId}/upload`, {
      method: 'POST',
      body: formData,
    });
    const json: ApiResponse<UploadedFile> = await res.json();
    if (!json.success || !res.ok) {
      throw new Error(json.error?.message || `Upload failed with HTTP ${res.status}`);
    }
    return json.data;
  },

  getUploadedFiles: (surveyId: string) =>
    fetchJson<UploadedFile[]>(`/surveys/${surveyId}/files`),

  getUploadedFile: (fileId: string) =>
    fetchJson<UploadedFile>(`/files/${fileId}`),

  retryUploadedFile: (fileId: string) =>
    fetchJson<UploadedFile>(`/files/${fileId}/retry`, {
      method: 'POST',
    }),

  getProcessingJobs: (surveyId?: string) =>
    fetchJson<ProcessingJob[]>(
      surveyId ? `/processing/jobs?survey_id=${surveyId}` : '/processing/jobs'
    ),

  getSpatialFootprint: (surveyId: string) =>
    fetchJson<SpatialFootprint>(`/surveys/${surveyId}/spatial-footprint`),

  // ---------------------------------------------------------------------------
  // Geospatial Processing & 2D GIS Map Services
  // ---------------------------------------------------------------------------
  startGeospatialProcessing: (surveyId: string, options?: { target_gsd_cm?: number; target_dem_res_m?: number }) =>
    fetchJson<any>(`/surveys/${surveyId}/processing/start`, {
      method: 'POST',
      body: JSON.stringify({
        survey_id: surveyId,
        target_gsd_cm: options?.target_gsd_cm ?? 2.5,
        target_dem_res_m: options?.target_dem_res_m ?? 0.5,
      }),
    }),

  getGeospatialPipelineStatus: (surveyId: string) =>
    fetchJson<GeospatialPipelineStatus>(`/surveys/${surveyId}/processing/status`),

  getSurveyProcessingJobs: (surveyId: string) =>
    fetchJson<ProcessingJob[]>(`/surveys/${surveyId}/processing/jobs`),

  getOrthomosaic: (surveyId: string) =>
    fetchJson<OrthomosaicManifest>(`/surveys/${surveyId}/orthomosaic`),

  getDem: (surveyId: string) =>
    fetchJson<DemManifest>(`/surveys/${surveyId}/dem`),

  getDsm: (surveyId: string) =>
    fetchJson<DsmManifest>(`/surveys/${surveyId}/dsm`),

  getPointCloudSummary: (surveyId: string) =>
    fetchJson<PointCloudSummary>(`/surveys/${surveyId}/point-cloud`),

  getSpatialLayers: (surveyId: string) =>
    fetchJson<{ survey_id: string; total_layers: number; layers: SpatialLayerItem[] }>(
      `/surveys/${surveyId}/spatial-layers`
    ),

  getDetectedBoundaries: (surveyId: string) =>
    fetchJson<DetectedBoundary[]>(`/surveys/${surveyId}/boundaries`),

  // ---------------------------------------------------------------------------
  // AI Geospatial Intelligence, Boundary Extraction & Historical Changes
  // ---------------------------------------------------------------------------
  getAIModels: () =>
    fetchJson<{ total_models: number; models: AIModelRecord[] }>('/ai/models'),

  getAISurveySummary: (surveyId: string) =>
    fetchJson<AISurveySummary>(`/ai/inference/survey/${surveyId}/summary`),

  runAIClassification: (surveyId: string, confidenceThreshold = 0.50) =>
    fetchJson<any>('/ai/classification/predict', {
      method: 'POST',
      body: JSON.stringify({
        survey_id: surveyId,
        confidence_threshold: confidenceThreshold,
      }),
    }),

  getAISurveyClassifications: (surveyId: string) =>
    fetchJson<AIClassificationRegion[]>(`/ai/classification/survey/${surveyId}`),

  detectAIBoundaries: (surveyId: string, confidenceThreshold = 0.60) =>
    fetchJson<any>('/ai/boundary/detect', {
      method: 'POST',
      body: JSON.stringify({
        survey_id: surveyId,
        confidence_threshold: confidenceThreshold,
      }),
    }),

  getAISurveyBoundaries: (surveyId: string) =>
    fetchJson<AIBoundaryCandidate[]>(`/ai/boundary/survey/${surveyId}`),

  verifyAIBoundary: (boundaryId: string, comment?: string, khasraNo?: string) =>
    fetchJson<any>(`/ai/boundary/${boundaryId}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        comment: comment || 'Surveyor verified candidate boundary as authoritative',
        khasra_no: khasraNo,
      }),
    }),

  rejectAIBoundary: (boundaryId: string, reason: string) =>
    fetchJson<any>(`/ai/boundary/${boundaryId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  editAIBoundaryVertices: (boundaryId: string, geometryGeojson: any, comment?: string) =>
    fetchJson<any>(`/ai/boundary/${boundaryId}/edit`, {
      method: 'POST',
      body: JSON.stringify({
        geometry_geojson: geometryGeojson,
        comment: comment || 'Surveyor adjusted boundary vertices',
      }),
    }),

  runAIChangeDetection: (surveyId: string, confidenceThreshold = 0.60) =>
    fetchJson<any>('/ai/change-detection', {
      method: 'POST',
      body: JSON.stringify({
        survey_id: surveyId,
        confidence_threshold: confidenceThreshold,
      }),
    }),

  getAISurveyChanges: (surveyId: string) =>
    fetchJson<AIHistoricalChange[]>(`/ai/change-detection/${surveyId}`),

  runFullAISuite: (surveyId: string, confidenceThreshold = 0.60) =>
    fetchJson<any>('/ai/inference/run-all', {
      method: 'POST',
      body: JSON.stringify({
        survey_id: surveyId,
        confidence_threshold: confidenceThreshold,
      }),
    }),

  // ---------------------------------------------------------------------------
  // Land Records, Ownership & Cadastral Intelligence APIs
  // ---------------------------------------------------------------------------
  getLandParcels: (
    filters?: {
      village?: string;
      survey_number?: string;
      land_use?: string;
      verification_status?: string;
      search_query?: string;
      skip?: number;
      limit?: number;
    },
    role: string = 'SURVEYOR'
  ) => {
    const params = new URLSearchParams();
    if (filters?.village) params.append('village', filters.village);
    if (filters?.survey_number) params.append('survey_number', filters.survey_number);
    if (filters?.land_use) params.append('land_use', filters.land_use);
    if (filters?.verification_status) params.append('verification_status', filters.verification_status);
    if (filters?.search_query) params.append('search_query', filters.search_query);
    if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<{ total: number; parcels: any[] }>(`/parcels${qs}`, {
      headers: { 'X-User-Role': role },
    });
  },

  getLandParcelDetail: (parcelId: string, role: string = 'SURVEYOR') =>
    fetchJson<any>(`/parcels/${parcelId}`, {
      headers: { 'X-User-Role': role },
    }),

  getParcelOwnership: (parcelId: string, role: string = 'SURVEYOR') =>
    fetchJson<any>(`/parcels/${parcelId}/ownership`, {
      headers: { 'X-User-Role': role },
    }),

  getParcelHistory: (parcelId: string) =>
    fetchJson<any>(`/parcels/${parcelId}/history`),

  getParcelChanges: (parcelId: string) =>
    fetchJson<any>(`/parcels/${parcelId}/changes`),

  getParcelDocuments: (parcelId: string) =>
    fetchJson<any>(`/parcels/${parcelId}/documents`),

  getParcelComparison: (parcelId: string) =>
    fetchJson<any>(`/parcels/${parcelId}/comparison`),

  matchParcelGeometry: (parcelId: string) =>
    fetchJson<any>(`/parcels/${parcelId}/match`, {
      method: 'POST',
    }),

  verifyParcelBoundary: (
    parcelId: string,
    payload: {
      status: string;
      surveyor_comment: string;
      verified_area_m2?: number;
      verified_geometry?: any;
    }
  ) =>
    fetchJson<any>(`/parcels/${parcelId}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  attachParcelDocument: (
    parcelId: string,
    payload: {
      title: string;
      document_type?: string;
      file_format?: string;
      source?: string;
      metadata_json?: Record<string, any>;
    }
  ) =>
    fetchJson<any>(`/parcels/${parcelId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  importLandRecords: (payload: {
    source_name: string;
    source_type: string;
    raw_content?: string;
    filename?: string;
    imported_by?: string;
  }) =>
    fetchJson<any>('/land-records/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getImportSessions: () =>
    fetchJson<any[]>('/land-records/import-sessions'),

  getImportSessionDetail: (sessionId: string) =>
    fetchJson<any>(`/land-records/import-sessions/${sessionId}`),

  getCadastralGeoJsonLayer: (role: string = 'SURVEYOR') =>
    fetchJson<any>('/cadastral/layer', {
      headers: { 'X-User-Role': role },
    }),

  // ---------------------------------------------------------------------------
  // End-to-End System Health & Survey Lifecycle
  // ---------------------------------------------------------------------------
  getSystemHealth: () =>
    fetchJson<any>('/system/health'),

  getSurveyLifecycle: (surveyId: string) =>
    fetchJson<any>(`/surveys/${surveyId}/lifecycle`),

  transitionSurveyLifecycle: (
    surveyId: string,
    targetStage: string,
    actorRole: string = 'SURVEYOR',
    comment?: string
  ) =>
    fetchJson<any>(
      `/surveys/${surveyId}/lifecycle/transition?target_stage=${targetStage}&actor_role=${actorRole}${
        comment ? `&comment=${encodeURIComponent(comment)}` : ''
      }`,
      { method: 'POST' }
    ),

  retryProcessing: (surveyId: string, stageId?: string) =>
    fetchJson<any>(
      `/surveys/${surveyId}/processing/retry${stageId ? `?stage_id=${stageId}` : ''}`,
      { method: 'POST' }
    ),

  cancelProcessing: (surveyId: string) =>
    fetchJson<any>(`/surveys/${surveyId}/processing/cancel`, { method: 'POST' }),
};


