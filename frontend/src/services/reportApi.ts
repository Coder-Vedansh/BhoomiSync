import {
  SurveyReportSummary,
  SurveyReportDetail,
  ReportCreatePayload,
  ReportValidationResult,
  ReportExportDTO,
} from '../types/report';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, any>;
}

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

export const reportApi = {
  async listReports(params?: {
    survey_id?: number;
    parcel_id?: string;
    status?: string;
    report_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ data: SurveyReportSummary[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.survey_id) query.set('survey_id', String(params.survey_id));
    if (params?.parcel_id) query.set('parcel_id', params.parcel_id);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.report_type && params.report_type !== 'ALL') query.set('report_type', params.report_type);
    if (params?.skip !== undefined) query.set('skip', String(params.skip));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/reports${qs ? `?${qs}` : ''}`;
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<SurveyReportSummary[]> = await res.json();
    return {
      data: json.data || [],
      total: json.meta?.total || (json.data ? json.data.length : 0),
    };
  },

  async getReport(reportId: string): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>(`/reports/${reportId}`);
  },

  async createReport(payload: ReportCreatePayload): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>('/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async generateReport(reportId: string): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>(`/reports/${reportId}/generate`, {
      method: 'POST',
    });
  },

  async submitForReview(reportId: string, comment?: string): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>(`/reports/${reportId}/submit-review`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  },

  async approveReport(reportId: string, approvedByName?: string, notes?: string): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>(`/reports/${reportId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        approved_by_name: approvedByName,
        notes,
      }),
    });
  },

  async rejectReport(reportId: string, reason: string): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>(`/reports/${reportId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async archiveReport(reportId: string): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>(`/reports/${reportId}/archive`, {
      method: 'POST',
    });
  },

  async generateDemoReport(): Promise<SurveyReportDetail> {
    return fetchJson<SurveyReportDetail>('/reports/demo', {
      method: 'POST',
    });
  },

  async getValidation(reportId: string): Promise<ReportValidationResult> {
    return fetchJson<ReportValidationResult>(`/reports/${reportId}/validation`);
  },

  async listExports(reportId: string): Promise<ReportExportDTO[]> {
    return fetchJson<ReportExportDTO[]>(`/reports/${reportId}/exports`);
  },

  getDownloadUrl(reportId: string, format: string): string {
    return `${API_BASE}/reports/${reportId}/${format.toLowerCase()}`;
  },

  async downloadExportBlob(reportId: string, format: string, fileName?: string): Promise<void> {
    const url = this.getDownloadUrl(reportId, format);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName || `${reportId.toLowerCase()}_export.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  },
};
