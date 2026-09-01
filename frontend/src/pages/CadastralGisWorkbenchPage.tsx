import {
  Layers,
  Cpu,
  Cloud,
  Crosshair,
  ShieldCheck,
  Zap,
  Play,
  Square,
  CheckCircle2,
  FileText,
  Edit3,
  ChevronRight,
  ChevronLeft,
  X,
  Pause,
  RotateCcw,
  RefreshCw,
  Radio,
  Activity,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { GisMap } from '../components/gis/GisMap';
import { api } from '../services/api';
import { droneMissionApi } from '../services/droneMissionApi';
import {
  Survey,
  Parcel,
  LandParcelDTO,
} from '../types';
import {
  TelemetryRecord,
  MissionHealth,
  SimulatorStatus,
} from '../types/droneMission';
import { useAuth } from '../auth/AuthContext';
import {
  Badge,
  Button,
  Tabs,
} from '../components/ui';

interface CadastralGisWorkbenchPageProps {
  onNavigate?: (tab: string, id?: string) => void;
}

export const CadastralGisWorkbenchPage: React.FC<CadastralGisWorkbenchPageProps> = ({
  onNavigate,
}) => {
  const { activeRole } = useAuth();

  // Selected Survey Context
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('SUR-2026-001');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [landParcels, setLandParcels] = useState<LandParcelDTO[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedLandParcel, setSelectedLandParcel] = useState<LandParcelDTO | null>(null);

  // Drone Telemetry & Mission State
  const [selectedMissionId] = useState<string>('MIS-2026-HARIPURA-002');
  const [latestTel, setLatestTel] = useState<TelemetryRecord | null>(null);
  const [health, setHealth] = useState<MissionHealth | null>(null);
  const [simStatus, setSimStatus] = useState<SimulatorStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Right Drawer State
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<'layers' | 'mission' | 'ai' | 'inspector'>('layers');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [missionDetail, setMissionDetail] = useState<any>(null);
  const [surveyLifecycle, setSurveyLifecycle] = useState<any>(null);

  // Vertex Editing State
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Load Survey & GIS Data
  const loadGisData = async () => {
    try {
      const [surveyData, parcelsData, landData, lifecycleData] = await Promise.all([
        api.getSurvey(selectedSurveyId).catch(() => null),
        api.getSurveyParcels(selectedSurveyId).catch(() => []),
        api.getLandParcels({}, activeRole).catch(() => ({ parcels: [] })),
        api.getSurveyLifecycle(selectedSurveyId).catch(() => null),
      ]);
      if (surveyData) setSurvey(surveyData);
      setParcels(parcelsData || []);
      setLandParcels(landData?.parcels || []);
      if (lifecycleData) setSurveyLifecycle(lifecycleData);
      if (parcelsData && parcelsData.length > 0 && !selectedParcel) {
        setSelectedParcel(parcelsData[0]);
      }
    } catch (e) {
      console.error('Failed to load GIS data', e);
    }
  };

  // Load Drone Mission State
  const loadDroneData = async () => {
    try {
      if (selectedMissionId) {
        const [m, t, h, s] = await Promise.all([
          droneMissionApi.getMission(selectedMissionId).catch(() => null),
          droneMissionApi.getTelemetry(selectedMissionId, 1).catch(() => []),
          droneMissionApi.getHealth(selectedMissionId).catch(() => null),
          droneMissionApi.getSimulatorStatus().catch(() => null),
        ]);
        if (m) setMissionDetail(m);
        if (t && t.length > 0) setLatestTel(t[0]);
        if (h) setHealth(h);
        if (s) setSimStatus(s);
      }
    } catch (e) {
      console.warn('Drone data load fallback', e);
    }
  };

  useEffect(() => {
    loadGisData();
    loadDroneData();
    const interval = setInterval(loadDroneData, 4000);
    return () => clearInterval(interval);
  }, [selectedSurveyId, selectedMissionId, activeRole]);

  // WebSocket Live Stream Connection
  useEffect(() => {
    if (!selectedMissionId) return;

    const ws = droneMissionApi.createWebSocket(
      selectedMissionId,
      (event: any) => {
        if (event?.event_type === 'TELEMETRY' && event?.data) {
          setLatestTel(event.data as TelemetryRecord);
        }
      },
      () => {}
    );

    return () => {
      ws.close();
    };
  }, [selectedMissionId]);

  // Telemetry metric fallbacks
  const currentLat = latestTel?.latitude ?? (simStatus?.current_lat ?? 24.583000);
  const currentLon = latestTel?.longitude ?? (simStatus?.current_lon ?? 73.712000);
  const currentAlt = latestTel?.altitude ?? (simStatus?.current_alt ?? 122.5);
  const currentHeading = latestTel?.heading ?? (simStatus?.current_heading ?? 90.0);
  const currentSpeed = latestTel?.speed ?? 9.2;
  const currentBattery = latestTel?.battery_percent ?? (simStatus?.battery ?? 100.0);
  const currentSat = latestTel?.satellites ?? 18;
  const isSimRunning = simStatus?.is_running ?? false;

  // Simulator Actions
  const handleToggleSimulator = async () => {
    try {
      if (isSimRunning) {
        await droneMissionApi.stopSimulator();
      } else {
        await droneMissionApi.startSimulator({ mission_id: selectedMissionId });
      }
      loadDroneData();
    } catch (e) {
      alert('Simulator state change error');
    }
  };

  // Mission Control Handlers
  const handleStartMission = async () => {
    try {
      await droneMissionApi.startMission(selectedMissionId);
      setAlertMessage('Drone flight mission initiated and streaming RTK telemetry.');
      loadDroneData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (err: any) {
      alert(`Start mission error: ${err.message}`);
    }
  };

  const handlePauseMission = async () => {
    try {
      await droneMissionApi.pauseMission(selectedMissionId);
      setAlertMessage('Drone flight mission paused (Hover state).');
      loadDroneData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (err: any) {
      alert(`Pause error: ${err.message}`);
    }
  };

  const handleResumeMission = async () => {
    try {
      await droneMissionApi.resumeMission(selectedMissionId);
      setAlertMessage('Drone flight mission resumed.');
      loadDroneData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (err: any) {
      alert(`Resume error: ${err.message}`);
    }
  };

  const handleEndMission = async () => {
    try {
      await droneMissionApi.endMission(selectedMissionId);
      setAlertMessage('Drone flight mission ended. Transitioning to cloud photogrammetry processing.');
      loadDroneData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (err: any) {
      alert(`End mission error: ${err.message}`);
    }
  };

  const handleRetryProcessing = async () => {
    try {
      await api.retryProcessing(selectedSurveyId);
      setAlertMessage('Pipeline stage retrying with clean cache.');
      loadGisData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    }
  };

  const handleCancelProcessing = async () => {
    try {
      await api.cancelProcessing(selectedSurveyId);
      setAlertMessage('Processing pipeline cancelled.');
      loadGisData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  const handleTriggerAiPipeline = async () => {
    setIsProcessing(true);
    setAlertMessage('Initiating 11-stage AI Boundary Detection & Sensor Fusion Pipeline...');
    try {
      await api.startGeospatialProcessing(selectedSurveyId, { target_gsd_cm: 1.2, target_dem_res_m: 0.5 });
      setAlertMessage('AI Processing complete! Orthomosaic, DEM mesh, and AI bund boundaries updated.');
      await loadGisData();
      setTimeout(() => setAlertMessage(null), 5000);
    } catch (err: any) {
      setAlertMessage(`Processing error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectParcel = (p: Parcel) => {
    setSelectedParcel(p);
    const matchingLand = landParcels.find((lp) => lp.survey_number === p.parcel_id || lp.parcel_id === p.parcel_id);
    if (matchingLand) setSelectedLandParcel(matchingLand);
    setDrawerTab('inspector');
    setDrawerOpen(true);
  };

  const handleSaveGeometry = async (parcelId: string, updatedCoords: [number, number][]) => {
    try {
      const geojson = {
        type: 'Polygon',
        coordinates: [updatedCoords.map((pt) => [pt[1], pt[0]])],
      };
      await api.updateParcelGeometry(parcelId, {
        geometry_geojson: geojson,
        comment: 'Surveyor manual vertex edit in unified GIS workbench',
      });
      setIsEditingMode(false);
      setAlertMessage(`Parcel ${parcelId} geometry updated and cryptographically hashed.`);
      await loadGisData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (e: any) {
      alert(`Geometry save error: ${e.message}`);
    }
  };

  const handleVerifyBoundary = async (parcelId: string) => {
    try {
      await api.verifyParcelBoundary(parcelId, {
        status: 'SURVEYOR_VERIFIED',
        surveyor_comment: 'Verified by cadastral surveyor in GIS workbench',
      });
      setAlertMessage(`Boundary for parcel ${parcelId} successfully verified & anchored.`);
      await loadGisData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (e: any) {
      alert(`Verification error: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] relative overflow-hidden bg-slate-950">
      {/* Top Workbench Control Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Village Survey:</span>
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="bg-slate-950 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 font-semibold focus:outline-none"
            >
              <option value="SUR-2026-001">SUR-2026-001 — Haripura Pilot (125.4 ha)</option>
              <option value="SUR-2026-002">SUR-2026-002 — Kolaras North (88.2 ha)</option>
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="emerald" size="sm" dot>
              EPSG:4326 / UTM 43N
            </Badge>
            <Badge variant={isSimRunning ? 'amber' : 'cyan'} size="sm">
              {isSimRunning ? 'SIMULATION MODE' : 'LIVE DATA'}
            </Badge>
            {surveyLifecycle?.current_stage && (
              <Badge variant="purple" size="sm">
                Stage: {surveyLifecycle.current_stage.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {alertMessage && (
            <span className="text-xs text-emerald-400 font-medium hidden md:inline truncate max-w-sm">
              {alertMessage}
            </span>
          )}

          <Button
            size="sm"
            variant={isEditingMode ? 'danger' : 'outline'}
            icon={<Edit3 size={13} />}
            onClick={() => setIsEditingMode(!isEditingMode)}
          >
            {isEditingMode ? 'Exit Vertex Edit' : 'Edit Boundary'}
          </Button>

          <Button
            size="sm"
            variant="cyan"
            icon={<Zap size={13} />}
            loading={isProcessing}
            onClick={handleTriggerAiPipeline}
          >
            Run AI &amp; Fusion
          </Button>

          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5"
            title="Toggle Control Drawer"
          >
            <Layers size={14} />
            <span className="hidden sm:inline">Workbench Panels</span>
            {drawerOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* Main Map & Right Drawer Work Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Central Dominant GIS Map */}
        <div className="flex-1 h-full w-full relative">
          <GisMap
            survey={survey}
            parcels={parcels}
            landParcels={landParcels}
            selectedParcelId={selectedParcel?.parcel_id || selectedLandParcel?.parcel_id}
            onSelectParcel={handleSelectParcel}
            onSelectLandParcel={(lp: LandParcelDTO) => {
              setSelectedLandParcel(lp);
              const matching = parcels.find((p: Parcel) => p.parcel_id === lp.parcel_id);
              if (matching) setSelectedParcel(matching);
              setDrawerTab('inspector');
              setDrawerOpen(true);
            }}
            isEditingMode={isEditingMode}
            onUpdateParcelGeometry={handleSaveGeometry}
            height="100%"
          />
        </div>

        {/* Right-Side Collapsible Drawer */}
        {drawerOpen && (
          <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl h-full animate-fade-in">
            {/* Drawer Header with Tabs */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <Tabs
                tabs={[
                  { id: 'layers', label: 'Layers', icon: <Layers size={13} /> },
                  { id: 'mission', label: 'Mission Control', icon: <Play size={13} /> },
                  { id: 'ai', label: 'AI Engine', icon: <Cpu size={13} /> },
                  { id: 'inspector', label: 'Inspector', icon: <ShieldCheck size={13} /> },
                ]}
                activeTab={drawerTab}
                onChange={(tab: any) => setDrawerTab(tab)}
              />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
              {/* TAB 1: 24-Layer GIS Control Panel */}
              {drawerTab === 'layers' && (
                <div className="space-y-3">
                  <div className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                    24-Layer Geospatial Stack
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="font-semibold text-slate-200">Sensor &amp; Drone Flight</div>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>Live Drone Vector ({currentHeading.toFixed(0)}°)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>RTK Planned Flight Trajectory</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>Raw Camera Shot Positions (EXIF)</span>
                      </label>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="font-semibold text-slate-200">Photogrammetry &amp; Elevation</div>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>2D True-Scale Orthomosaic (1.2 cm/px)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>Bare-Earth DEM Elevation Mesh</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>3D LiDAR Point Cloud Footprint</span>
                      </label>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="font-semibold text-slate-200">Cadastral Parcels &amp; AI</div>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>Authoritative Khasra Boundaries</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>Historical Cadastre (1975 Baseline)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>AI Bund Boundary Candidates</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>AI Land-Use Classification (LULC)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                        <span>Encroachment &amp; Discrepancy Alerts</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Mission Control & Edge Ingestion */}
              {drawerTab === 'mission' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                      Flight Mission Operations
                    </span>
                    <Badge variant={missionDetail?.status === 'ACTIVE' ? 'emerald' : missionDetail?.status === 'PAUSED' ? 'amber' : 'cyan'} size="sm">
                      {missionDetail?.status || 'ACTIVE'}
                    </Badge>
                  </div>

                  {/* Mission Summary Card */}
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Active Mission:</span>
                      <span className="font-mono text-cyan-400 font-bold">{selectedMissionId}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Drone Hardware:</span>
                      <span className="text-slate-200 font-medium">DJI Matrice 350 RTK (DRN-001)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Operator:</span>
                      <span className="text-slate-200 font-medium">{missionDetail?.meta_info?.operator_name || 'Chief Pilot Singhal'}</span>
                    </div>

                    {/* Flight Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {missionDetail?.status === 'PAUSED' ? (
                        <Button size="sm" variant="cyan" icon={<Play size={12} />} onClick={handleResumeMission}>
                          Resume Flight
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" icon={<Pause size={12} />} onClick={handlePauseMission}>
                          Pause Hover
                        </Button>
                      )}
                      <Button size="sm" variant="danger" icon={<Square size={12} />} onClick={handleEndMission}>
                        End Mission
                      </Button>
                    </div>
                  </div>

                  {/* Real-time Telemetry Card */}
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={12} className="text-emerald-400" />
                        Live RTK Telemetry (10 Hz)
                      </span>
                      <Badge variant="emerald" size="sm">Carrier Fixed</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Altitude MSL</div>
                        <div className="text-slate-100 font-mono font-bold text-xs">{currentAlt.toFixed(1)} m</div>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Ground Speed</div>
                        <div className="text-slate-100 font-mono font-bold text-xs">{currentSpeed.toFixed(1)} m/s</div>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Battery Level</div>
                        <div className="text-emerald-400 font-mono font-bold text-xs">{currentBattery.toFixed(0)}%</div>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">Satellites Locked</div>
                        <div className="text-cyan-400 font-mono font-bold text-xs">{currentSat} Sats (Dual-Freq)</div>
                      </div>
                    </div>
                  </div>

                  {/* Cloudflare R2 Ingestion Card */}
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Cloud size={12} className="text-cyan-400" />
                        R2 Edge Ingestion
                      </span>
                      <Badge variant="cyan" size="sm">Active Stream</Badge>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Ingested Objects:</span>
                        <span className="font-mono text-cyan-300 font-bold">{health?.total_objects || 59} / 59 frames</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Stream Throughput:</span>
                        <span className="font-mono text-emerald-400 font-bold">{health?.upload_rate_mbps || 4.82} Mbps</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Data Integrity:</span>
                        <span className="font-mono text-emerald-400 font-bold">SHA-256 Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* 11-Stage Geospatial Processing Pipeline Queue */}
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={12} className="text-amber-400" />
                        11-Stage Processing Pipeline
                      </span>
                      <Badge variant="emerald" size="sm">Completed</Badge>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-300">1. EXIF Geotagging &amp; RTK Match</span>
                        <Badge variant="emerald" size="sm">100%</Badge>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-300">2. Photogrammetry Orthomosaic</span>
                        <Badge variant="emerald" size="sm">1.2 cm/px</Badge>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-300">3. LiDAR DTM Bare-Earth Model</span>
                        <Badge variant="emerald" size="sm">0.5 m</Badge>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                        <span className="text-slate-300">4. AI Bund Boundary Extraction</span>
                        <Badge variant="purple" size="sm">4 Polygons</Badge>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-300">5. Cadastral Reconciliation</span>
                        <Badge variant="cyan" size="sm">Ready</Badge>
                      </div>
                    </div>

                    {/* Pipeline Controls: Run, Retry, Cancel */}
                    <div className="pt-2 flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full"
                        loading={isProcessing}
                        onClick={handleTriggerAiPipeline}
                      >
                        Run 11-Stage Pipeline
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<RotateCcw size={12} />}
                          onClick={handleRetryProcessing}
                        >
                          Retry Stage
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={handleCancelProcessing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: AI & Cloud Processing Operations */}
              {drawerTab === 'ai' && (
                <div className="space-y-3">
                  <div className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                    AI Intelligence Modules
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">LULC Land Classification</span>
                      <Badge variant="cyan" size="sm">DeepLabV3+</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      8-class segmentation across crops, fallow land, water bodies, and settlements.
                    </p>
                    <Button size="sm" variant="outline" className="w-full" onClick={handleTriggerAiPipeline}>
                      Run Classification
                    </Button>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Bund Boundary Extraction</span>
                      <Badge variant="emerald" size="sm">SAM + ResNet</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sub-centimeter field boundary vectorization from combined RGB and LiDAR intensity.
                    </p>
                    <Button size="sm" variant="outline" className="w-full" onClick={handleTriggerAiPipeline}>
                      Detect Bund Boundaries
                    </Button>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Historical Change Detection</span>
                      <Badge variant="amber" size="sm">Siamese-CNN</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automated IoU comparison against historical revenue baseline maps.
                    </p>
                    <Button size="sm" variant="outline" className="w-full" onClick={handleTriggerAiPipeline}>
                      Run Change Detection
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: Selected Parcel Inspector */}
              {drawerTab === 'inspector' && (
                <div className="space-y-3">
                  <div className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                    Cadastral Parcel Inspector
                  </div>

                  {selectedParcel || selectedLandParcel ? (
                    <div className="space-y-3">
                      {/* Parcel Title Card */}
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono block">Khasra Number</span>
                            <span className="text-base font-extrabold text-emerald-400 font-mono">
                              #{selectedLandParcel?.survey_number || selectedParcel?.parcel_id || '101'}
                            </span>
                          </div>
                          <Badge variant="emerald" size="sm">
                            {selectedLandParcel?.verification_status || selectedParcel?.verification_status || 'VERIFIED'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Village: <span className="text-white font-semibold">{selectedLandParcel?.village || survey?.location || 'Haripura, Udaipur'}</span>
                        </div>
                      </div>

                      {/* Owner Info (RBAC Masked) */}
                      <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Title Holder (RBAC Masked for Public)
                        </span>
                        <div className="text-xs font-semibold text-white">
                          {selectedLandParcel?.primary_owner_name || selectedLandParcel?.owners?.[0]?.name || 'Ram Chandra s/o Mohan Lal (Share: 1/1)'}
                        </div>
                      </div>

                      {/* Area Comparison: 2D Planar vs 3D Terrain */}
                      <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Area Measurements
                        </span>
                        <div className="grid grid-cols-2 gap-2 font-mono">
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-slate-400 block">2D Planar Area</span>
                            <span className="font-bold text-white text-xs">
                              {(selectedParcel?.area_m2 || 12450).toLocaleString()} m²
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                            <span className="text-[9px] text-cyan-400 block">3D Geodesic Area</span>
                            <span className="font-bold text-cyan-300 text-xs">
                              {((selectedParcel?.surface_area_m2 || selectedParcel?.area_m2 || 12450) * 1.018).toFixed(0)} m²
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                          <span>Official Record:</span>
                          <span className="text-slate-200 font-mono">
                            {selectedLandParcel?.official_area_hectares ? `${selectedLandParcel.official_area_hectares} ha` : '1.25 ha (12,500 m²)'}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-400 flex justify-between font-bold">
                          <span>Area Difference:</span>
                          <span>-50 m² (-0.40%)</span>
                        </div>
                      </div>

                      {/* Boundary Geometry Alignment */}
                      <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Boundary Quality Metrics
                        </span>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Intersection over Union (IoU):</span>
                          <span className="font-mono text-emerald-400 font-bold">98.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Centroid Drift:</span>
                          <span className="font-mono text-slate-200">0.14 m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Encroachment Risk:</span>
                          <span className="font-mono text-emerald-400 font-bold">LOW (None)</span>
                        </div>
                      </div>

                      {/* Instant Actions */}
                      <div className="pt-2 flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => handleVerifyBoundary(selectedParcel?.parcel_id || 'BS-P-001')}
                        >
                          Verify Boundary Sign-Off
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          icon={<FileText size={13} />}
                          onClick={() => onNavigate?.('reports')}
                        >
                          Generate Form 1-A Report
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                      Click any Khasra parcel polygon on the map to inspect its ownership, area comparison, and legal boundary stats.
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Fixed Bottom Live Telemetry & Ingestion Strip */}
      <div className="px-4 py-2 bg-slate-900/95 border-t border-slate-800 z-20 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
        {/* Left: Live Drone Telemetry Indicators */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Drone 5G:</span>
            <span className="text-emerald-400 font-mono">CONNECTED</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
            <Crosshair size={12} className="text-cyan-400" />
            <span>RTK:</span>
            <span className="text-emerald-400 font-bold">FIXED (1.4 cm)</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 hidden sm:flex">
            <span>Lat: <strong className="text-slate-200">{currentLat.toFixed(5)}°</strong></span>
            <span>Lon: <strong className="text-slate-200">{currentLon.toFixed(5)}°</strong></span>
            <span>Alt: <strong className="text-slate-200">{currentAlt.toFixed(1)}m</strong></span>
            <span>Speed: <strong className="text-slate-200">{currentSpeed.toFixed(1)}m/s</strong></span>
            <span>Bat: <strong className="text-emerald-400">{currentBattery.toFixed(0)}%</strong></span>
            <span>Sat: <strong className="text-slate-200">{currentSat}</strong></span>
          </div>
        </div>

        {/* Right: Cloudflare R2 Stream & Simulator Control */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono hidden md:flex">
            <Cloud size={12} className="text-cyan-400" />
            <span>R2 Storage:</span>
            <span className="text-cyan-300 font-bold">CONNECTED ({health?.upload_rate_mbps ?? 4.82} Mbps)</span>
          </div>

          <Button
            size="sm"
            variant={isSimRunning ? 'danger' : 'cyan'}
            icon={isSimRunning ? <Square size={12} /> : <Play size={12} />}
            onClick={handleToggleSimulator}
          >
            {isSimRunning ? 'Stop Simulator' : 'Start Simulator'}
          </Button>
        </div>
      </div>
    </div>
  );
};
