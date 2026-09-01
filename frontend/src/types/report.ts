export type ReportStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'FAILED';

export type ReportType =
  | 'CADASTRAL_SURVEY'
  | 'BOUNDARY_VERIFICATION'
  | 'DISPUTE_INVESTIGATION'
  | 'PUBLIC_INFORMATION'
  | 'CHANGE_DETECTION';

export type ExportFormat = 'PDF' | 'JSON' | 'GEOJSON' | 'CSV' | 'KML';

export interface ReportSectionDTO {
  id?: number;
  section_key: string;
  title: string;
  order_index: number;
  content: Record<string, any>;
  is_included: boolean;
}

export interface ReportExportDTO {
  export_id: string;
  file_name: string;
  file_format: string;
  storage_provider: string;
  storage_key: string;
  checksum_sha256: string;
  file_size_bytes: number;
  mime_type: string;
  download_url?: string;
  status: string;
  created_at: string;
}

export interface ReportValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  quality_score: number;
  parcel_found: boolean;
  survey_found: boolean;
  geometry_valid: boolean;
  crs_valid: boolean;
  rtk_quality: string;
  verification_status: string;
  has_historical_comparison: boolean;
  has_ai_classification: boolean;
}

export interface SurveyReportSummary {
  id: number;
  report_id: string;
  report_number: string;
  survey_id: number;
  parcel_id: string;
  report_type: ReportType;
  version: number;
  status: ReportStatus;
  title: string;
  summary?: string;
  snapshot_checksum_sha256?: string;
  preferred_unit: string;
  verification_status: string;
  requested_by: string;
  approved_by?: string;
  generated_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  export_count: number;
}

export interface SurveyReportDetail extends SurveyReportSummary {
  data_snapshot?: Record<string, any>;
  included_sections: string[];
  sections: ReportSectionDTO[];
  exports: ReportExportDTO[];
  validation?: ReportValidationResult;
}

export interface ReportCreatePayload {
  survey_id: number;
  parcel_id: string;
  report_type?: ReportType;
  title?: string;
  summary?: string;
  preferred_unit?: string;
  included_sections?: string[];
}
