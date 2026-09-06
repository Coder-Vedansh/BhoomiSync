import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Zap,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';


import { reportApi } from '../services/reportApi';
import { SurveyReportSummary } from '../types/report';
import { GenerateReportModal } from '../components/reports/GenerateReportModal';
import {
  PageHeader,
  StatGrid,
  MetricCard,
  Card,
  Button,
  DataTable,
  Badge,
  StatusBadge,
  SearchInput,
  Select,
  ErrorState,
} from '../components/ui';

interface ReportsPageProps {
  onNavigate?: (tab: string, reportId?: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<SurveyReportSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportApi.listReports();
      setReports(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateDemo = async () => {
    setActionLoading('demo');
    try {
      const demo = await reportApi.generateDemoReport();
      await fetchReports();
      if (onNavigate) {
        onNavigate('report-detail', demo.report_id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate demo report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (reportId: string, format: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await reportApi.downloadExportBlob(reportId, format);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && r.report_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.report_number.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.parcel_id.toLowerCase().includes(q) ||
        (r.snapshot_checksum_sha256 && r.snapshot_checksum_sha256.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalReports = reports.length;
  const approvedReports = reports.filter((r) => r.status === 'APPROVED').length;
  const underReviewReports = reports.filter((r) => r.status === 'UNDER_REVIEW').length;
  const totalExports = reports.reduce((acc, r) => acc + (r.export_count || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Survey Reports & Document Exports"
        subtitle="Multi-format cadastral dossiers, 3D terrain analysis, AI classification & legal boundary verification snapshots"
        badge={
          <Badge variant="emerald" dot>
            Dossier Archive
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              icon={<Zap size={14} className="text-cyan-400" />}
              loading={actionLoading === 'demo'}
              onClick={handleGenerateDemo}
            >
              1-Click Demo Dossier
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setIsModalOpen(true)}
            >
              Generate Survey Report
            </Button>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={fetchReports} />}

      {/* 2. Key Metric Stat Grid */}
      <StatGrid columns={4}>
        <MetricCard
          label="Total Reports"
          value={<span className="font-mono text-2xl font-extrabold text-[#20251F]">{totalReports}</span>}
          subtitle="Cadastral dossiers created"
          icon={<FileText size={16} />}
          variant="emerald"
        />
        <MetricCard
          label="Surveyor Approved"
          value={<span className="font-mono text-2xl font-extrabold text-[#2E6645]">{approvedReports}</span>}
          subtitle="Legally signed &amp; anchored"
          icon={<ShieldCheck size={16} />}
          variant="emerald"
        />
        <MetricCard
          label="Under Review"
          value={<span className="font-mono text-2xl font-extrabold text-[#927323]">{underReviewReports}</span>}
          subtitle="Awaiting official sign-off"
          icon={<Clock size={16} />}
          variant="amber"
        />
        <MetricCard
          label="Export Artifacts"
          value={<span className="font-mono text-2xl font-extrabold text-[#385963]">{totalExports}</span>}
          subtitle="PDF, GeoJSON, KML, CSV, JSON"
          icon={<Layers size={16} />}
          variant="cyan"
        />
      </StatGrid>

      {/* 3. Filter & Search Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:max-w-md">
            <SearchInput
              placeholder="Search by Report #, Title, Parcel ID, SHA-256..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#5F665D] flex-shrink-0">
              <Filter size={13} />
              <span>Filters:</span>
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 w-full sm:w-36"
            >
              <option value="ALL">All Statuses</option>
              <option value="GENERATED">Generated</option>
              <option value="APPROVED">Approved</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="DRAFT">Draft</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs py-2 w-full sm:w-44"
            >
              <option value="ALL">All Types</option>
              <option value="PARCEL_SURVEY_REPORT">Parcel Survey (Form 1-A)</option>
              <option value="VILLAGE_CADASTRE_SUMMARY">Village Cadastre Summary</option>
              <option value="DISPUTE_INVESTIGATION">Dispute Investigation</option>
              <option value="BOUNDARY_VERIFICATION">Boundary Verification</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* 4. Authoritative Reports Data Table */}
      <Card
        title="Cadastral Reports Archive"
        subtitle="Authoritative document dossiers with cryptographic checksums and multi-format exports"
      >
        <DataTable<SurveyReportSummary>
          columns={[

            {
              header: 'Report Number',
              accessor: (r) => (
                <div>
                  <div className="font-mono font-bold text-[#20251F] text-xs">{r.report_number}</div>
                  <div className="text-[11px] text-[#5F665D] truncate max-w-xs">{r.title}</div>
                </div>
              ),
              width: '200px',
            },
            {
              header: 'Target Parcel',
              accessor: (r) => (
                <div>
                  <span className="font-mono font-bold text-[#2E513E]">{r.parcel_id}</span>
                  <div className="text-[11px] text-[#5F665D] font-mono">v{r.version}</div>
                </div>
              ),
              width: '120px',
            },
            {
              header: 'Report Type',
              accessor: (r) => (
                <span className="text-xs text-[#20251F]">
                  {r.report_type.replace(/_/g, ' ')}
                </span>
              ),
            },
            {
              header: 'Created Date',
              accessor: (r) => (
                <span className="font-mono text-xs text-[#5F665D]">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              ),
              width: '110px',
            },
            {
              header: 'Status',
              accessor: (r) => <StatusBadge status={r.status} />,
              width: '120px',
            },
            {
              header: 'Artifact Downloads',
              accessor: (r) => {
                const getFormatStyle = (fmt: string) => {
                  switch (fmt) {
                    case 'pdf':
                      return 'bg-[#FAEAE5] text-[#914B38] border-[#E6C0B1] hover:bg-[#AD6048] hover:text-white';
                    case 'geojson':
                      return 'bg-[#E6EFE8] text-[#2E6645] border-[#BBD4C1] hover:bg-[#2E513E] hover:text-white';
                    case 'kml':
                      return 'bg-[#E8F1F3] text-[#385963] border-[#BDD7DE] hover:bg-[#568693] hover:text-white';
                    case 'csv':
                      return 'bg-[#FBF4DC] text-[#74591D] border-[#EBD99A] hover:bg-[#B18F2E] hover:text-white';
                    case 'json':
                      return 'bg-[#FAF8F3] text-[#4F574D] border-[#D8D5CC] hover:bg-[#2E513E] hover:text-white';
                    default:
                      return 'bg-[#EFEEE8] text-[#5F665D] border-[#D8D5CC] hover:bg-[#2E513E] hover:text-white';
                  }
                };
                return (
                  <div className="flex items-center gap-1 flex-wrap">
                    {['pdf', 'geojson', 'kml', 'csv', 'json'].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={(e) => handleDownload(r.report_id, fmt, e)}
                        title={`Download ${fmt.toUpperCase()}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border transition-all duration-150 cursor-pointer ${getFormatStyle(fmt)}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                );
              },
            },
            {
              header: 'Action',
              accessor: (r) => (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<ArrowRight size={13} />}
                  iconPosition="right"
                  onClick={() => onNavigate?.('report-detail', r.report_id)}
                >
                  View
                </Button>
              ),
              width: '90px',
            },
          ]}
          data={filteredReports}
          keyExtractor={(r) => r.report_id}
          loading={loading}
          emptyMessage="No reports match the selected filters. Generate a new report using the button above."
        />
      </Card>

      {/* 5. Modal for Generating Report */}
      <GenerateReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(reportId) => {
          fetchReports();
          if (onNavigate) {
            onNavigate('report-detail', reportId);
          }
        }}
      />
    </div>

  );
};
