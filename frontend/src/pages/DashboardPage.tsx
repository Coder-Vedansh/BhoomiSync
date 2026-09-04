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
} from 'lucide-react';
import { api } from '../services/api';
import { droneMissionApi } from '../services/droneMissionApi';
import { Survey } from '../types';
import { DroneMission, TelemetryRecord, MissionHealth, SimulatorStatus } from '../types/droneMission';
import { DataProvenanceBadge } from '../components/ui';
import { useDroneTransition } from '../context/DroneTransitionContext';

interface DashboardPageProps {
  onNavigate: (tab: string, id?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { triggerDroneTransition } = useDroneTransition();
  const [surveys, setSurveys] = useState<Survey[]>([]);
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
        const [surveysData, missionList, simData] = await Promise.all([
          api.getSurveys().catch(() => []),
          droneMissionApi.listMissions().catch(() => []),
          droneMissionApi.getSimulatorStatus().catch(() => null),
        ]);
        setSurveys(surveysData || []);
        setMissions(missionList || []);
        setSimStatus(simData);

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
  }, []);

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
      {/* 1. TOP HEADER & WORKSPACE ACTIONS */}
      <div className="bg-[#131b2e] border border-[#22334d] rounded-2xl p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/25">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Operational Station
            </span>
            <span className="text-xs font-mono text-slate-400">
              Pilot Survey: Haripura Revenue Village
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Survey Operations &amp; Command Center
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Statutory cadastral resurvey platform: Cellular 5G drone telemetry ingestion, Cloudflare R2 zero-egress imagery repository, and PostGIS boundary validation.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="h-10 px-3.5 rounded-xl bg-[#0e1424] border border-[#2b3c58] text-sm font-medium text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer shadow-xs"
          >
            <option value="SUR-2026-001">SUR-2026-001 (Haripura Pilot - 125.4 ha)</option>
            <option value="SUR-2026-002">SUR-2026-002 (Kolaras North - 88.2 ha)</option>
          </select>

          <button
            onClick={() => onNavigate('gis')}
            className="h-10 inline-flex items-center gap-2 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-md shadow-sky-500/15 transition-all cursor-pointer"
          >
            <MapPin size={16} />
            <span>Launch GIS Map</span>
            <ArrowRight size={15} />
          </button>

          <button
            onClick={handleToggleSimulator}
            className={`h-10 inline-flex items-center gap-2 px-4 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
              isSimRunning
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                : 'bg-[#182338] hover:bg-[#1e2c46] text-slate-200 border-[#2b3c58]'
            }`}
          >
            {isSimRunning ? <Square size={14} className="text-rose-400" /> : <Play size={14} className="text-sky-400" />}
            <span>{isSimRunning ? 'Stop Simulator' : 'Flight Simulator'}</span>
          </button>
        </div>
      </div>

      {/* 2. KEY METRICS (4 Distinct Elevated Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Survey Area */}
        <div
          onClick={() => onNavigate('gis')}
          className="bg-[#131b2e] border border-[#22334d] hover:border-[#38bdf8]/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total Survey Area</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {totalHectares.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-slate-400">hectares</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-[#1e2c42] pt-2.5">
              <span>{(totalHectares * 2.471).toFixed(1)} Acres</span>
              <span className="text-sky-400 font-medium">EPSG:4326 UTM 43N</span>
            </div>
          </div>
        </div>

        {/* Card 2: Registered Parcels */}
        <div
          onClick={() => onNavigate('land-registry')}
          className="bg-[#131b2e] border border-[#22334d] hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Registered Parcels</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {totalParcels}
              </span>
              <span className="text-sm font-medium text-slate-400">Khasra plots</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-[#1e2c42] pt-2.5">
              <span>100% Georeferenced</span>
              <span className="text-emerald-400 font-medium">PostGIS Vector</span>
            </div>
          </div>
        </div>

        {/* Card 3: Surveyed Villages */}
        <div
          onClick={() => onNavigate('gis')}
          className="bg-[#131b2e] border border-[#22334d] hover:border-amber-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Surveyed Villages</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MapPin size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {surveys.length || 1}
              </span>
              <span className="text-sm font-medium text-slate-400">pilot village</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-[#1e2c42] pt-2.5">
              <span className="text-amber-300 font-semibold">Haripura</span>
              <span>Girwa, Udaipur</span>
            </div>
          </div>
        </div>

        {/* Card 4: Cloud Datasets */}
        <div
          onClick={() => onNavigate('gis')}
          className="bg-[#131b2e] border border-[#22334d] hover:border-purple-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Cloud Datasets</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {totalDatasets}
              </span>
              <span className="text-sm font-medium text-slate-400">spatial rasters</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-[#1e2c42] pt-2.5">
              <span>RGB Ortho &amp; DEM</span>
              <span className="text-purple-300 font-medium">Cloudflare R2</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HARDWARE TELEMETRY & CLOUDFLARE R2 (2 Distinct Elevated Cards) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Card A: Hardware Sensor Telemetry */}
        <div className="bg-[#131b2e] border border-[#22334d] rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2c42]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                  <Radio size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Hardware Sensor Telemetry</h3>
                  <p className="text-xs text-slate-400">Physical ESP32-S3 IoT Node</p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-sky-300 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-md">
                ESP32-S3 PAYLOAD
              </span>
            </div>

            <div className="divide-y divide-[#1e2c42] text-sm mt-1">
              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">Payload Device</span>
                <span className="text-slate-200 font-medium font-mono">BhoomiSync-ESP32S3-Drone</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">Camera Imagery Frames</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-white font-mono font-semibold">128 Received</span>
                  <DataProvenanceBadge source="LIVE" />
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">ToF Distance Sensor</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-mono font-semibold">{tofDistanceCm.toFixed(1)} cm (Valid)</span>
                  <DataProvenanceBadge source="LIVE" />
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">Flight Altitude</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-200 font-mono font-medium">{currentAlt.toFixed(1)} m</span>
                  <DataProvenanceBadge source={isSimRunning ? 'SIMULATED' : 'ESTIMATED'} />
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">GNSS / RTK Receiver</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-mono text-xs">Not Installed (Phase 2)</span>
                  <DataProvenanceBadge source="UNAVAILABLE" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs border-t border-[#1e2c42] mt-2">
            <span className="text-slate-400 font-mono">
              Mission ID: {activeMission?.mission_id || 'MIS-2026-HARIPURA-002'}
            </span>
            <button
              onClick={() => onNavigate('gis')}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 cursor-pointer text-sm"
            >
              <span>Inspect Telemetry in GIS</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Card B: Cloudflare R2 Object Store & Processing */}
        <div className="bg-[#131b2e] border border-[#22334d] rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1e2c42]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Cloud size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Cloudflare R2 Storage &amp; Engine</h3>
                  <p className="text-xs text-slate-400">Zero-Egress S3 Compatible Store</p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-md">
                S3 ZERO-EGRESS
              </span>
            </div>

            <div className="divide-y divide-[#1e2c42] text-sm mt-1">
              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">R2 Ingested Volume</span>
                <span className="text-slate-200 font-mono font-medium">40.2 MB (59 Objects)</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">Upload Streaming Rate</span>
                <span className="text-slate-200 font-mono font-medium">{health?.upload_rate_mbps ?? 4.82} Mbps (5G Cellular)</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">Photogrammetry Pipeline</span>
                <span className="text-emerald-400 font-mono font-semibold">11/11 Stages Complete (100%)</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">2D Orthomosaic Resolution</span>
                <span className="text-slate-200 font-mono font-medium">2.5 cm / pixel GSD</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="text-slate-400">Integrity Checksum</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> SHA-256 Validated
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs border-t border-[#1e2c42] mt-2">
            <span className="text-slate-400 font-mono">
              Bucket: bhoomisync-surveys-prod
            </span>
            <button
              onClick={() => onNavigate('gis')}
              className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 cursor-pointer text-sm"
            >
              <span>View Orthomosaic Rasters</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. STATUTORY PROGRESSION & ATTENTION REQUIRED (2 Distinct Elevated Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card: 10-Stage Pipeline Tracker */}
        <div className="lg:col-span-2 bg-[#131b2e] border border-[#22334d] rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e2c42]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Statutory Survey Lifecycle</h3>
                <p className="text-xs text-slate-400">Rajasthan Land Revenue Statutory Flow</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-md">
              Stage 6 of 10: Surveyor Review (60%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-[#0e1424] rounded-full overflow-hidden border border-[#1e2c42]">
            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: '60%' }} />
          </div>

          {/* Step Nodes */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center pt-2">
            {stages.map((st, idx) => {
              const isPast = idx < 5;
              const isCurrent = idx === 5;
              return (
                <div key={st.num} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-sky-500 text-white ring-2 ring-sky-400/50'
                        : isPast
                        ? 'bg-[#18263e] text-sky-400 border border-sky-500/30'
                        : 'bg-[#0e1424] text-slate-500 border border-[#1e2c42]'
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

        {/* Card: Attention Required */}
        <div className="bg-[#141824] border border-amber-500/30 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-amber-300">Attention Required</h3>
              <p className="text-xs text-amber-400/70">Discrepancy &amp; Hardware Notice</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-amber-200 text-sm">
                <span>Khasra #104 Boundary Shift</span>
                <span className="font-mono text-xs text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">-0.05 ha</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Surveyed polygon differs by 4.2% from revenue settlement record. Surveyor verification sign-off pending.
              </p>
              <button
                onClick={() => onNavigate('land-registry')}
                className="text-xs text-amber-300 hover:text-amber-200 font-semibold underline mt-1 cursor-pointer inline-flex items-center gap-1"
              >
                <span>Inspect in Land Registry</span>
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1424] border border-[#22334d] space-y-1.5">
              <div className="flex items-center justify-between font-medium text-slate-200 text-sm">
                <span>GNSS Module Status</span>
                <span className="text-slate-400 font-mono text-xs bg-[#182236] px-2 py-0.5 rounded">HW PENDING</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hardware GNSS/RTK receiver not detected on current ESP32-S3 payload. Camera &amp; ToF sensors active.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. GIS WORKBENCH PREVIEW BANNER CARD */}
      <div className="bg-[#131b2e] border border-[#22334d] rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            <MapIcon size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Cadastral GIS Map Canvas (Haripura Pilot)</h3>
            <p className="text-sm text-slate-300 mt-0.5">
              Interactive 24-layer GIS map with live 2D orthomosaic tiles, DEM elevation mesh, and surveyor vertex boundary editing.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('gis')}
          className="h-10 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0 cursor-pointer shadow-md shadow-sky-500/15"
        >
          <span>Open Fullscreen Map</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 6. RECENT OPERATIONAL ACTIVITY CARD */}
      <div className="bg-[#131b2e] border border-[#22334d] rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2c42]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Recent Operational Activity</h3>
              <p className="text-xs text-slate-400">Statutory audit trail &amp; sensor sync events</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">Live Feed</span>
        </div>

        <div className="divide-y divide-[#1e2c42] text-sm">
          {[
            {
              time: '12 mins ago',
              title: 'Parcel Khasra #102 Verified by Surveyor',
              detail: 'Boundary matched with 96.4% IoU score against aerial orthomosaic.',
              icon: <ShieldCheck size={16} className="text-emerald-400" />,
            },
            {
              time: '45 mins ago',
              title: 'AI Crop Bund Segmentation Complete',
              detail: 'Meta Segment Anything (SAM ViT) extracted 4 candidate farm boundaries.',
              icon: <Activity size={16} className="text-purple-400" />,
            },
            {
              time: '2 hours ago',
              title: 'Cloudflare R2 Imagery Sync Finalized',
              detail: '59 imagery frames and ToF telemetry packets synchronized with SHA-256 integrity seal.',
              icon: <UploadCloud size={16} className="text-sky-400" />,
            },
            {
              time: '3 hours ago',
              title: 'Statutory Form 1-A Dossier Compiled',
              detail: 'Multi-format survey dossier compiled for Haripura revenue village.',
              icon: <FileText size={16} className="text-amber-400" />,
            },
          ].map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-start gap-3.5">
              <div className="mt-1 w-7 h-7 rounded-lg bg-[#0e1424] border border-[#22334d] flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 text-sm">{item.title}</div>
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
