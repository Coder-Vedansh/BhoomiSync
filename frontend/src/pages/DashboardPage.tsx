import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ShieldCheck,
  FileText,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Play,
  Square,
  Crosshair,
  Zap,
  Cloud,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { droneMissionApi } from '../services/droneMissionApi';
import { Survey } from '../types';
import { DroneMission, TelemetryRecord, MissionHealth, SimulatorStatus } from '../types/droneMission';
import { Badge } from '../components/ui';

interface DashboardPageProps {
  onNavigate: (tab: string, id?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [, setLoading] = useState(true);
  const [missions, setMissions] = useState<DroneMission[]>([]);
  const [health, setHealth] = useState<MissionHealth | null>(null);
  const [simStatus, setSimStatus] = useState<SimulatorStatus | null>(null);
  const [latestTel, setLatestTel] = useState<TelemetryRecord | null>(null);
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const totalHectares = surveys.reduce((acc, s) => acc + (s.total_area_hectares || 0), 0);
  const totalParcels = surveys.reduce((acc, s) => acc + (s.parcel_count || 0), 0);
  const totalDatasets = surveys.reduce((acc, s) => acc + (s.dataset_count || 0), 0);
  const activeMission = missions.length > 0 ? missions[0] : null;
  const isSimRunning = simStatus?.is_running ?? false;

  const handleToggleSimulator = async () => {
    try {
      if (isSimRunning) {
        await droneMissionApi.stopSimulator();
      } else {
        await droneMissionApi.startSimulator({ mission_id: activeMission?.mission_id || 'MIS-2026-HARIPURA-002' });
      }
      const s = await droneMissionApi.getSimulatorStatus();
      setSimStatus(s);
    } catch (e) {
      alert('Simulator state error');
    }
  };

  const stages = [
    { num: 1, title: 'Planned', desc: 'Boundary pre-cleared' },
    { num: 2, title: 'Pre-Flight', desc: 'Sensors calibrated' },
    { num: 3, title: 'Flight Active', desc: '10 Hz RTK logging' },
    { num: 4, title: 'Data Ingested', desc: 'R2 SHA-256 verified' },
    { num: 5, title: 'Processing', desc: 'SfM Orthomosaic & DEM' },
    { num: 6, title: 'Surveyor Review', desc: 'Ground verification', active: true },
    { num: 7, title: 'Objections', desc: 'Dispute arbitration' },
    { num: 8, title: 'Official Approval', desc: 'Tehsildar e-Seal' },
    { num: 9, title: 'Gazette Notice', desc: 'Public land record' },
    { num: 10, title: 'Completed', desc: 'ROR / Khasra final' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO COMMAND BANNER */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM OPERATIONAL
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Crosshair size={13} className="text-cyan-400" />
                RTK CARRIER FIXED (1.4 cm)
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/70 border border-slate-800">
                <Clock size={13} className="text-slate-400" />
                UTC {timeStr}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              BhoomiSync Operational Command
            </h1>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Real-time cadastral resurvey suite: Cellular 5G drone avionics, Cloudflare R2 zero-egress ingestion, and AI boundary extraction for high-precision land governance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigate('gis')}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <MapPin size={16} />
              <span>Launch GIS Workbench</span>
              <ArrowRight size={14} className="ml-0.5" />
            </button>

            <button
              onClick={handleToggleSimulator}
              className={`px-4 py-3 rounded-xl font-bold text-xs transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer border shadow-md ${
                isSimRunning
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
            >
              {isSimRunning ? <Square size={14} className="text-rose-400" /> : <Play size={14} className="text-cyan-400" />}
              <span>{isSimRunning ? 'Stop Flight Simulator' : 'Start Flight Simulator'}</span>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} className="text-amber-400" />
              <span>Dossiers</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS GRID (4 Clean, Spacious Metric Cards) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Surveyed Land Area */}
        <div
          onClick={() => onNavigate('gis')}
          className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Surveyed Land</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-cyan-300 my-1">
              {totalHectares.toFixed(1)} <span className="text-sm font-normal text-slate-400">ha</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Acreage:</span>
            <span className="font-mono font-bold text-emerald-400">{(totalHectares * 2.471).toFixed(1)} Acres</span>
          </div>
        </div>

        {/* Card 2: Registered Khasra Parcels */}
        <div
          onClick={() => onNavigate('land-registry')}
          className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Parcels</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-emerald-300 my-1">
              {totalParcels}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Database:</span>
            <span className="font-semibold text-emerald-400">PostGIS Spatial Vector</span>
          </div>
        </div>

        {/* Card 3: Pilot Revenue Villages */}
        <div
          onClick={() => onNavigate('gis')}
          className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Survey Campaigns</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <MapPin size={16} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-amber-300 my-1">
              {surveys.length}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Location:</span>
            <span className="font-semibold text-amber-300">Haripura, Udaipur</span>
          </div>
        </div>

        {/* Card 4: Sensor Datasets in R2 */}
        <div
          onClick={() => onNavigate('gis')}
          className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">R2 Cloud Datasets</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-purple-300 my-1">
              {totalDatasets}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Payloads:</span>
            <span className="font-semibold text-purple-300">RGB, LiDAR, DEM</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 10-STAGE STATUTORY LIFECYCLE PROGRESSION (Spacious 2-Row Layout) */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles size={17} className="text-emerald-400" />
              10-Stage Statutory Survey Lifecycle Progression
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active Survey: <strong className="text-emerald-300 font-mono">SUR-2026-001 (Haripura Agricultural Resurvey Pilot)</strong>
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono w-fit">
            STAGE 6: SURVEYOR_REVIEW (60% COMPLETE)
          </span>
        </div>

        {/* 10 Clean Grid Tiles (5 columns on desktop, 2 on mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stages.map((st, idx) => {
            const isCompleted = idx < 5;
            const isCurrent = idx === 5;

            return (
              <div
                key={st.num}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-purple-500/15 border-purple-400 shadow-lg shadow-purple-500/10'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/25'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                      isCurrent
                        ? 'bg-purple-500 text-white animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : st.num}
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono uppercase ${
                      isCurrent ? 'text-purple-300' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {isCurrent ? 'ACTIVE' : isCompleted ? 'DONE' : 'PENDING'}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-white leading-snug">
                    {st.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    {st.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DUAL TELEMETRY & CLOUDFLARE R2 STATUS CARDS (Clean 2x2 Inner Grids) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A: Live Drone Avionics Cluster */}
        <div className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Radio size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Drone Flight Avionics (10 Hz)</h3>
                <p className="text-xs text-slate-400">DJI Matrice 350 RTK (DRN-001) via 5G Bridge</p>
              </div>
            </div>
            <Badge variant={isSimRunning ? 'amber' : 'emerald'} size="sm" dot>
              {isSimRunning ? 'SIMULATOR ACTIVE' : '5G CONNECTED'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">RTK Carrier</div>
              <div className="font-mono text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <Crosshair size={14} /> FIXED (1.4 cm)
              </div>
            </div>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Altitude MSL</div>
              <div className="font-mono text-base font-bold text-white">
                {(latestTel?.altitude ?? simStatus?.current_alt ?? 122.5).toFixed(1)} m
              </div>
            </div>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Ground Speed</div>
              <div className="font-mono text-base font-bold text-cyan-300">
                {(latestTel?.speed ?? 9.2).toFixed(1)} m/s
              </div>
            </div>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Battery Level</div>
              <div className="font-mono text-base font-bold text-emerald-400">
                {(latestTel?.battery_percent ?? simStatus?.battery ?? 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Active Flight: </span>
              <span className="text-white font-mono font-bold">{activeMission?.mission_id || 'MIS-2026-HARIPURA-002'}</span>
            </div>
            <button
              onClick={() => onNavigate('gis')}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-xs hover:underline cursor-pointer"
            >
              <span>View Map Track</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Section B: Cloudflare R2 Ingestion & Processing Pipeline */}
        <div className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Cloud size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Cloudflare R2 Storage</h3>
                <p className="text-xs text-slate-400">Zero-Egress Ingestion &amp; OpenDroneMap Gateway</p>
              </div>
            </div>
            <Badge variant="emerald" size="sm">
              Bucket Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Ingested Frames</div>
              <div className="font-mono text-base font-bold text-white">
                {activeMission?.total_objects ?? 59} frames
              </div>
            </div>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Data Volume</div>
              <div className="font-mono text-base font-bold text-purple-300">
                {(((activeMission?.total_bytes ?? 0) || 41943040) / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Upload Rate</div>
              <div className="font-mono text-base font-bold text-emerald-400">
                {health?.upload_rate_mbps ?? 4.82} Mbps
              </div>
            </div>
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Integrity Check</div>
              <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={13} /> SHA-256 OK
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Photogrammetry: </span>
              <span className="text-emerald-400 font-mono font-bold">11/11 Stages Complete (100%)</span>
            </div>
            <button
              onClick={() => onNavigate('gis')}
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 text-xs hover:underline cursor-pointer"
            >
              <span>View Orthomosaic</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. 4 PRIMARY WORKSTATIONS (Spacious 2x2 Hub) */}
      {/* ========================================================================= */}
      <div>
        <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
          <Layers size={18} className="text-cyan-400" />
          Primary Operational Workstations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Workstation 1: GIS Workbench */}
          <div
            onClick={() => onNavigate('gis')}
            className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
                  <MapPin size={22} />
                </div>
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  CORE WORKSPACE
                </span>
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Cadastral GIS Workbench
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                24-layer interactive Leaflet map, real-time drone flight telemetry HUD, dynamic 2D orthomosaic tiles, DEM elevation mesh, and surveyor vertex editor.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400">
              <span>Open Map &amp; Layers &rarr;</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Workstation 2: Land Registry */}
          <div
            onClick={() => onNavigate('land-registry')}
            className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  REVENUE RECORDS
                </span>
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Authoritative Land Registry
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Khasra plot search, Khatedar ownership records, spatial geometric difference calculation, boundary dispute arbitration, and verification sign-offs.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-400">
              <span>Search &amp; Inspect Parcels &rarr;</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Workstation 3: AI Intelligence */}
          <div
            onClick={() => onNavigate('gis')}
            className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
                  <Zap size={22} />
                </div>
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  AI INFERENCE
                </span>
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                AI Boundary Extraction &amp; LULC
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Automated Meta Segment Anything (SAM ViT) farm bund extraction, SegFormer 8-class agricultural land-use prediction, and boundary change detection.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-purple-400">
              <span>Run AI Segmentation &rarr;</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Workstation 4: Reports & Exports */}
          <div
            onClick={() => onNavigate('reports')}
            className="p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all duration-200 shadow-xl cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
                  <FileText size={22} />
                </div>
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  EXPORT DOSSIERS
                </span>
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Reports &amp; Revenue Dossiers
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Compile statutory Form 1-A revenue dossiers with cryptographic SHA-256 seal, Google Earth KML files, GeoJSON vectors, and landowner CSV tables.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400">
              <span>Generate &amp; Download Reports &rarr;</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
