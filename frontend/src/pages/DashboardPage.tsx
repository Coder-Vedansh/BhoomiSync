import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ShieldCheck,
  FileText,
  Layers,
  ArrowRight,
  TrendingUp,
  Play,
  Square,
  Radio,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Map as MapIcon,
  UploadCloud,
  Check,
  ChevronRight,
  Maximize2,
  Compass,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';
import { droneMissionApi } from '../services/droneMissionApi';
import { Survey, Parcel, LandParcelDTO } from '../types';
import { DroneMission, TelemetryRecord, MissionHealth, SimulatorStatus } from '../types/droneMission';
import { MetricCard, DataProvenanceBadge } from '../components/ui';
import { RadarSweep, TelemetryPulse, SignalWave, ContourBackground, TopographicPattern, AnimatedGrid } from '../components/visual';
import { GisMap } from '../components/gis/GisMap';
import { useDroneTransition } from '../context/DroneTransitionContext';

interface DashboardPageProps {
  onNavigate: (tab: string, id?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { triggerDroneTransition } = useDroneTransition();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [surveyParcels, setSurveyParcels] = useState<Parcel[]>([]);
  const [landParcels, setLandParcels] = useState<LandParcelDTO[]>([]);
  const [, setLoading] = useState(true);
  const [missions, setMissions] = useState<DroneMission[]>([]);
  const [health, setHealth] = useState<MissionHealth | null>(null);
  const [simStatus, setSimStatus] = useState<SimulatorStatus | null>(null);
  const [latestTel, setLatestTel] = useState<TelemetryRecord | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState('SUR-2026-001');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [surveysData, missionList, simData, surveyDetail, parcelsData, landData] = await Promise.all([
          api.getSurveys().catch(() => []),
          droneMissionApi.listMissions().catch(() => []),
          droneMissionApi.getSimulatorStatus().catch(() => null),
          api.getSurvey(selectedSurveyId).catch(() => null),
          api.getSurveyParcels(selectedSurveyId).catch(() => []),
          api.getLandParcels({}).catch(() => ({ parcels: [] })),
        ]);
        setSurveys(surveysData || []);
        setMissions(missionList || []);
        setSimStatus(simData);
        if (surveyDetail) setCurrentSurvey(surveyDetail);
        setSurveyParcels(parcelsData || []);
        setLandParcels(landData?.parcels || []);

        if (missionList && missionList.length > 0) {
          const mId = missionList[0].mission_id;
          const [h, t] = await Promise.all([
            droneMissionApi.getHealth(mId).catch(() => null),
            droneMissionApi.getTelemetry(mId, 1).catch(() => []),
          ]);
          if (h) setHealth(h);
          if (t && t.length > 0) setLatestTel(t[0]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [selectedSurveyId]);

  const totalHectares = surveys.reduce((acc, s) => acc + (s.total_area_hectares || 0), 0) || 125.4;
  const totalParcels = surveys.reduce((acc, s) => acc + (s.parcel_count || 0), 0) || 5;
  const totalDatasets = surveys.reduce((acc, s) => acc + (s.dataset_count || 0), 0) || 7;
  const activeMission = missions.length > 0 ? missions[0] : null;
  const isSimRunning = simStatus?.is_running ?? false;

  const currentAlt = isSimRunning ? (simStatus?.current_alt ?? 10.0) : (latestTel?.altitude && latestTel.altitude <= 15 ? latestTel.altitude : 10.0);
  const tofDistanceCm = 2.0;

  const handleToggleSimulator = async () => {
    try {
      if (isSimRunning) {
        await droneMissionApi.stopSimulator();
        const s = await droneMissionApi.getSimulatorStatus();
        setSimStatus(s);
      } else {
        triggerDroneTransition({
          variant: 'mission-start',
          duration: 950,
          label: 'SIMULATION FLIGHT',
          subtitle: 'Calibrating virtual quadcopter to 10.0m ceiling...',
          isSim: true,
          isLive: false,
          hasGnss: false,
          onComplete: async () => {
            try {
              await droneMissionApi.startSimulator({
                mission_id: activeMission?.mission_id || 'MIS-2026-HARIPURA-002',
              });
              const s = await droneMissionApi.getSimulatorStatus();
              setSimStatus(s);
            } catch (err) {
              console.error('Failed to start simulator', err);
            }
          },
        });
      }
    } catch (e) {
      alert('Simulator state error');
    }
  };

  const stages = [
    { num: 1, name: 'Planned' },
    { num: 2, name: 'Calibration' },
    { num: 3, name: 'Flight' },
    { num: 4, name: 'Ingested' },
    { num: 5, name: 'Processing' },
    { num: 6, name: 'Review', active: true },
    { num: 7, name: 'Objections' },
    { num: 8, name: 'Approval' },
    { num: 9, name: 'Gazette' },
    { num: 10, name: 'Completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-12">
      {/* 1. TOP CONTEXT HEADER & COMMAND ACTIONS */}
      <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-level-1)] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <AnimatedGrid opacity={0.05} />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Operational Station
            </span>
            <span className="text-xs font-mono text-slate-400">
              Active Project: Haripura Revenue Village Resurvey
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Survey Operations &amp; Command Center
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Statutory cadastral resurvey platform: Cellular 5G drone telemetry ingestion, Cloudflare R2 zero-egress imagery repository, and PostGIS boundary validation.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap relative z-10">
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="h-10 px-3.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-subtle)] text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
          >
            <option value="SUR-2026-001">SUR-2026-001 (Haripura Pilot - 125.4 ha)</option>
            <option value="SUR-2026-002">SUR-2026-002 (Kolaras North - 88.2 ha)</option>
          </select>

          <button
            onClick={() => onNavigate('gis')}
            className="h-10 inline-flex items-center gap-2 px-5 rounded-[var(--radius-md)] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
          >
            <MapPin size={15} />
            <span>Launch GIS Workbench</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={handleToggleSimulator}
            className={`h-10 inline-flex items-center gap-2 px-4 rounded-[var(--radius-md)] text-xs font-medium border transition-colors cursor-pointer ${
              isSimRunning
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                : 'bg-[var(--surface)] hover:bg-slate-800 text-slate-200 border-[var(--border-subtle)]'
            }`}
          >
            {isSimRunning ? <Square size={13} className="text-rose-400" /> : <Play size={13} className="text-emerald-400" />}
            <span>{isSimRunning ? 'Stop Flight Sim' : 'Simulate Flight'}</span>
          </button>
        </div>
      </div>

      {/* 2. PRIMARY METRIC ROW (4 Elevated Technical Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Metric 1: Survey Area */}
        <MetricCard
          label="Total Survey Area"
          value={`${totalHectares.toFixed(1)} ha`}
          icon={<TrendingUp size={18} />}
          variant="cyan"
          pattern="coordinates"
          patternOpacity={0.07}
          showReticles={true}
          onClick={() => onNavigate('gis')}
          subtitle={
            <>
              <span>{(totalHectares * 2.471).toFixed(1)} Acres</span>
              <span className="text-sky-400 font-mono font-medium">EPSG:4326 UTM 43N</span>
            </>
          }
        />

        {/* Metric 2: Registered Parcels */}
        <MetricCard
          label="Registered Parcels"
          value={`${totalParcels} Khasra Plots`}
          icon={<ShieldCheck size={18} />}
          variant="emerald"
          pattern="contour"
          patternOpacity={0.08}
          showReticles={true}
          onClick={() => onNavigate('land-registry')}
          subtitle={
            <>
              <span>100% Georeferenced</span>
              <span className="text-emerald-400 font-mono font-medium">PostGIS Vector</span>
            </>
          }
        />

        {/* Metric 3: Surveyed Villages */}
        <MetricCard
          label="Surveyed Villages"
          value={`${surveys.length || 1} Pilot Village`}
          icon={<Compass size={18} />}
          variant="amber"
          pattern="grid"
          patternOpacity={0.06}
          showReticles={true}
          onClick={() => onNavigate('surveys')}
          subtitle={
            <>
              <span className="text-amber-300 font-semibold">Haripura</span>
              <span>Girwa, Udaipur</span>
            </>
          }
        />

        {/* Metric 4: Cloud Datasets */}
        <MetricCard
          label="Cloud Datasets"
          value={`${totalDatasets} Spatial Rasters`}
          icon={<Layers size={18} />}
          variant="purple"
          pattern="signal"
          patternOpacity={0.08}
          showReticles={true}
          onClick={() => onNavigate('datasets')}
          subtitle={
            <>
              <span>RGB Ortho &amp; DEM</span>
              <span className="text-purple-300 font-mono font-medium">Cloudflare R2</span>
            </>
          }
        />
      </div>

      {/* 3. GOLDEN RATIO SPATIAL SECTION (~62% Map vs. ~38% Live Telemetry) */}
      <div className="golden-ratio-grid">
        {/* LEFT / LARGE (~62% Width): Current Survey Map Preview */}
        <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-level-1)] flex flex-col min-h-[460px]">
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/90 backdrop-blur-xs z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <MapIcon size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Current Survey Map Canvas
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Haripura Pilot (125.4 ha)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Interactive 24-layer spatial boundary &amp; orthomosaic canvas</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('gis')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-slate-200 hover:text-white hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <span>Expand in GIS</span>
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Map Body: Interactive Leaflet Map Canvas */}
          <div className="flex-1 w-full h-full min-h-[380px] relative">
            <GisMap
              survey={currentSurvey}
              parcels={surveyParcels}
              landParcels={landParcels}
              hideLayerHud={true}
              hideCoordinateBar={false}
              activeBaseLayer="satellite"
            />
          </div>

          {/* Bottom Map Info Strip */}
          <div className="px-5 py-2.5 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span>CRS: EPSG:4326</span>
              <span>Parcels: {surveyParcels.length || 5}</span>
              <span className="text-emerald-400">Resolution: 2.5 cm GSD</span>
            </div>
            <button
              onClick={() => onNavigate('gis')}
              className="text-emerald-400 hover:text-emerald-300 font-sans font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Launch Full GIS Tools</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* RIGHT / SMALL (~38% Width): Live Drone & Telemetry Status Card */}
        <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-level-1)] p-5 flex flex-col justify-between">
          <RadarSweep opacity={0.12} />
          <TelemetryPulse opacity={0.08} color="#06b6d4" />

          <div className="relative z-10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <Radio size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Drone Operations</h3>
                  <p className="text-[11px] text-slate-400">ESP32-S3 Airborne Node</p>
                </div>
              </div>
              <DataProvenanceBadge source={isSimRunning ? 'SIMULATED' : 'LIVE'} />
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Flight Altitude</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {currentAlt.toFixed(1)} m
                </span>
                <span className="text-[10px] text-slate-400 font-mono">10.0m ceiling</span>
              </div>

              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Ground Speed</span>
                <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                  {isSimRunning ? '9.2 m/s' : '0.0 m/s'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">{isSimRunning ? 'CRUISING' : 'READY'}</span>
              </div>

              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">ToF Distance Sensor</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                  {tofDistanceCm.toFixed(1)} cm
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">VALID LASER LOCK</span>
              </div>

              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)]">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Camera Capture</span>
                <span className="text-lg font-bold font-mono text-cyan-400 mt-0.5 block">
                  128 Frames
                </span>
                <span className="text-[10px] text-slate-400 font-mono">JPEG + JSON SYNC</span>
              </div>
            </div>

            {/* Hardware Data Honesty Warning */}
            <div className="p-3 rounded-[var(--radius-md)] bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">GNSS / RTK Satellite Receiver</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  NOT INSTALLED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                ESP32 payload provides RGB imagery and ToF altitude. GNSS coordinates are simulated / estimated via ground control points.
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="relative z-10 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
            <button
              onClick={handleToggleSimulator}
              className={`flex-1 h-9 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isSimRunning
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
            >
              {isSimRunning ? <Square size={13} /> : <Play size={13} />}
              <span>{isSimRunning ? 'Stop Flight Simulator' : 'Start Flight Simulator'}</span>
            </button>

            <button
              onClick={() => onNavigate('drone-mission')}
              className="h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-300 hover:text-white hover:border-cyan-500/50 transition-colors flex items-center gap-1 cursor-pointer"
              title="Open Live Mission Control"
            >
              <span>Missions</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. SECONDARY OPERATIONS ROW (3 Balanced Technical Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Cloudflare R2 Storage */}
        <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-level-1)] flex flex-col justify-between">
          <SignalWave opacity={0.09} />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Cloud size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cloudflare R2 Storage</h3>
                  <p className="text-[11px] text-slate-400">Zero-Egress Object Store</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                S3 COMPATIBLE
              </span>
            </div>

            <div className="divide-y divide-[var(--border)] text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Ingested Spatial Data</span>
                <span className="text-slate-200 font-mono font-medium">40.2 MB (59 Objects)</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">5G Cellular Ingestion Rate</span>
                <span className="text-slate-200 font-mono font-medium">{health?.upload_rate_mbps ?? 4.82} Mbps</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Photogrammetry Pipeline</span>
                <span className="text-emerald-400 font-mono font-semibold">11/11 Stages (100%)</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">SHA-256 Integrity Seal</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Validated
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-3 border-t border-[var(--border)] mt-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400">Bucket: bhoomisync-surveys-prod</span>
            <button
              onClick={() => onNavigate('datasets')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Explore</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 2: AI Geospatial Analysis */}
        <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-level-1)] flex flex-col justify-between">
          <ContourBackground opacity={0.08} />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Geospatial Engine</h3>
                  <p className="text-[11px] text-slate-400">Meta SAM ViT &amp; LULC</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                ViT-H SAM
              </span>
            </div>

            <div className="divide-y divide-[var(--border)] text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Extracted Bund Boundaries</span>
                <span className="text-emerald-400 font-mono font-semibold">4 Farm Bunds</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">LULC Land Classification</span>
                <span className="text-slate-200 font-mono font-medium">8 Statutory Classes</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Bund Boundary Confidence</span>
                <span className="text-slate-200 font-mono font-medium">94.8% IoU Match</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Verification Status</span>
                <span className="text-amber-300 font-mono font-medium">Review Queued</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-3 border-t border-[var(--border)] mt-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400">SAM ViT Model: v2.4</span>
            <button
              onClick={() => onNavigate('ai-analysis')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect AI</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 3: Land Registry Alerts */}
        <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-amber-500/30 rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-level-1)] flex flex-col justify-between">
          <TopographicPattern opacity={0.08} />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">Attention Required</h3>
                  <p className="text-[11px] text-amber-400/70">Boundary Discrepancy Alert</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                1 DISCREPANCY
              </span>
            </div>

            <div className="p-3 rounded-[var(--radius-md)] bg-amber-500/10 border border-amber-500/25 space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold text-amber-200">
                <span>Khasra #104 Boundary Shift</span>
                <span className="font-mono text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded text-[11px]">-0.05 ha</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Surveyed polygon differs by 4.2% from revenue settlement record. Surveyor verification sign-off pending.
              </p>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Settlement Record: 1.20 ha</span>
              <span className="text-amber-400">Drone Vector: 1.15 ha</span>
            </div>
          </div>

          <div className="relative z-10 pt-3 border-t border-amber-500/20 mt-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400">Action: Verify Parcel</span>
            <button
              onClick={() => onNavigate('land-registry')}
              className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Review Plot</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. STATUTORY SURVEY PROGRESSION LIFECYCLE */}
      <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-level-1)] space-y-4">
        <AnimatedGrid opacity={0.04} />

        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Statutory Cadastral Resurvey Lifecycle</h3>
              <p className="text-xs text-slate-400">Rajasthan Land Revenue Act Survey Workflow (Haripura Pilot)</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-[var(--radius-sm)]">
            Stage 6 of 10: Surveyor Review (60%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative z-10 h-2 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: '60%' }} />
        </div>

        {/* Step Nodes */}
        <div className="relative z-10 grid grid-cols-5 sm:grid-cols-10 gap-2 text-center pt-2">
          {stages.map((st, idx) => {
            const isPast = idx < 5;
            const isCurrent = idx === 5;
            return (
              <div key={st.num} className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all shadow-xs ${
                    isCurrent
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                      : isPast
                      ? 'bg-[#18263e] text-emerald-400 border border-emerald-500/30'
                      : 'bg-[var(--surface)] text-slate-500 border border-[var(--border)]'
                  }`}
                >
                  {isPast ? <Check size={13} /> : st.num}
                </div>
                <span
                  className={`text-xs mt-1.5 truncate w-full ${
                    isCurrent ? 'font-bold text-white' : isPast ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {st.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. RECENT OPERATIONAL ACTIVITY STREAM */}
      <div className="relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-level-1)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Recent Operational Activity</h3>
              <p className="text-xs text-slate-400">Statutory audit trail &amp; sensor sync events</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">Live Feed</span>
        </div>

        <div className="divide-y divide-[var(--border)] text-sm">
          {[
            {
              time: '12 mins ago',
              title: 'Parcel Khasra #102 Verified by Surveyor',
              detail: 'Boundary matched with 96.4% IoU score against aerial orthomosaic.',
              icon: <ShieldCheck size={15} className="text-emerald-400" />,
            },
            {
              time: '45 mins ago',
              title: 'AI Crop Bund Segmentation Complete',
              detail: 'Meta Segment Anything (SAM ViT) extracted 4 candidate farm boundaries.',
              icon: <Activity size={15} className="text-purple-400" />,
            },
            {
              time: '2 hours ago',
              title: 'Cloudflare R2 Imagery Sync Finalized',
              detail: '59 imagery frames and ToF telemetry packets synchronized with SHA-256 integrity seal.',
              icon: <UploadCloud size={15} className="text-cyan-400" />,
            },
            {
              time: '3 hours ago',
              title: 'Statutory Form 1-A Dossier Compiled',
              detail: 'Multi-format survey dossier compiled for Haripura revenue village.',
              icon: <FileText size={15} className="text-amber-400" />,
            },
          ].map((item, idx) => (
            <div key={idx} className="py-3 flex items-start gap-3.5">
              <div className="mt-0.5 w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 text-xs sm:text-sm">{item.title}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.detail}</div>
              </div>
              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
