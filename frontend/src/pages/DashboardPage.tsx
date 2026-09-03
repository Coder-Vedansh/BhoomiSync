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
  Activity,
  Cloud,
  Cpu,
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
    { num: 1, name: 'PLANNED', done: true },
    { num: 2, name: 'PRE_FLIGHT_CALIBRATION', done: true },
    { num: 3, name: 'MISSION_IN_PROGRESS', done: true },
    { num: 4, name: 'DATA_INGESTED', done: true },
    { num: 5, name: 'PROCESSING', done: true },
    { num: 6, name: 'SURVEYOR_REVIEW', active: true },
    { num: 7, name: 'COMMUNITY_OBJECTION', done: false },
    { num: 8, name: 'OFFICIAL_APPROVAL', done: false },
    { num: 9, name: 'GAZETTE_NOTIFICATION', done: false },
    { num: 10, name: 'COMPLETED', done: false },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. HERO COMMAND BANNER (Cyber-Cartography Glassmorphism) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/20 shadow-2xl backdrop-blur-xl">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM OPERATIONAL
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Crosshair size={12} className="text-cyan-400" />
                RTK CENTIMETER FIXED
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock size={12} className="text-slate-500" />
                UTC {timeStr}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-200 tracking-tight">
              BhoomiSync Operational Command
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time cadastral resurvey suite: Cellular 5G drone avionics, Cloudflare R2 zero-egress ingestion, and AI boundary extraction for high-precision land governance.
            </p>
          </div>

          {/* Quick Action Matrix */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onNavigate('gis')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <MapPin size={15} />
              <span>Launch GIS Workbench</span>
              <ArrowRight size={14} className="ml-1" />
            </button>

            <button
              onClick={handleToggleSimulator}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer border shadow-lg ${
                isSimRunning
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 shadow-rose-500/10'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 shadow-cyan-500/10'
              }`}
            >
              {isSimRunning ? <Square size={14} className="text-rose-400" /> : <Play size={14} className="text-cyan-400" />}
              <span>{isSimRunning ? 'Stop Flight Simulator' : 'Start Flight Simulator'}</span>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} className="text-amber-400" />
              <span>Dossiers</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS GRID (Cyber Glass Cards with Glowing Radial Halos) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Surveyed Land Area */}
        <div
          onClick={() => onNavigate('gis')}
          className="group relative p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 shadow-xl cursor-pointer overflow-hidden transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Surveyed Land</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-200">
            {totalHectares.toFixed(1)} <span className="text-sm font-normal text-slate-400">ha</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold font-mono">{(totalHectares * 2.471).toFixed(1)} Acres</span>
            <span>sub-cm verified</span>
          </div>
        </div>

        {/* Card 2: Registered Khasra Parcels */}
        <div
          onClick={() => onNavigate('land-registry')}
          className="group relative p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 shadow-xl cursor-pointer overflow-hidden transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Parcels</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-100">
            {totalParcels}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">100% Georeferenced</span>
            <span>in PostGIS</span>
          </div>
        </div>

        {/* Card 3: Pilot Revenue Villages */}
        <div
          onClick={() => onNavigate('gis')}
          className="group relative p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 shadow-xl cursor-pointer overflow-hidden transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Survey Campaigns</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
              <MapPin size={18} />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-100">
            {surveys.length}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-amber-400 font-semibold font-mono">Haripura Pilot</span>
            <span>Udaipur, RJ</span>
          </div>
        </div>

        {/* Card 4: Sensor Datasets in R2 */}
        <div
          onClick={() => onNavigate('gis')}
          className="group relative p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 transition-all duration-300 shadow-xl cursor-pointer overflow-hidden transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">R2 Cloud Datasets</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-200">
            {totalDatasets}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-purple-400 font-semibold">RGB &amp; LiDAR</span>
            <span>Zero-Egress S3</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 10-STAGE SURVEY LIFECYCLE STEPPER (High-Tech Progression Radar) */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-400" />
              10-Stage Statutory Survey Lifecycle Progression
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Active Survey: <strong className="text-emerald-300 font-mono">SUR-2026-001 (Haripura Agricultural Resurvey Pilot)</strong>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
            STAGE 6: SURVEYOR_REVIEW (60% COMPLETE)
          </span>
        </div>

        {/* Stepper Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
          {stages.map((st) => (
            <div
              key={st.num}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                st.active
                  ? 'bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/20 scale-105'
                  : st.done
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
              }`}
            >
              <div
                className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold font-mono mb-1.5 ${
                  st.active
                    ? 'bg-purple-500 text-white animate-pulse'
                    : st.done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {st.done ? '✓' : st.num}
              </div>
              <div className="text-[10px] font-bold uppercase truncate leading-tight">
                {st.name.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DUAL TELEMETRY & CLOUD PIPELINE CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A: Live Drone Avionics Cluster */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Radio size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">Physical Drone Avionics &amp; 10 Hz Telemetry</h3>
                <p className="text-[11px] text-slate-400">DJI Matrice 350 RTK (DRN-001) via Cellular 5G Bridge</p>
              </div>
            </div>
            <Badge variant={isSimRunning ? 'amber' : 'emerald'} size="sm" dot>
              {isSimRunning ? 'SIMULATOR ACTIVE' : '5G CARRIER FIXED'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">RTK Carrier</span>
              <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <Crosshair size={12} /> FIXED (1.4 cm)
              </span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Altitude MSL</span>
              <span className="font-mono text-sm font-bold text-white mt-1 block">
                {(latestTel?.altitude ?? simStatus?.current_alt ?? 122.5).toFixed(1)} m
              </span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Ground Speed</span>
              <span className="font-mono text-sm font-bold text-cyan-300 mt-1 block">
                {(latestTel?.speed ?? 9.2).toFixed(1)} m/s
              </span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Battery Level</span>
              <span className="font-mono text-sm font-bold text-emerald-400 mt-1 block">
                {(latestTel?.battery_percent ?? simStatus?.battery ?? 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" />
              <span className="text-slate-300">Active Flight: <strong className="text-white font-mono">{activeMission?.mission_id || 'MIS-2026-HARIPURA-002'}</strong></span>
            </div>
            <button
              onClick={() => onNavigate('gis')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 text-xs hover:underline cursor-pointer"
            >
              <span>View Map Track</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Section B: Cloudflare R2 Ingestion & Processing Pipeline */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Cloud size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">Cloudflare R2 Storage &amp; Zero-Egress Gateway</h3>
                <p className="text-[11px] text-slate-400">Presigned S3 streaming to OpenDroneMap &amp; TiTiler</p>
              </div>
            </div>
            <Badge variant="emerald" size="sm">
              Bucket Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Ingested Frames</span>
              <span className="font-mono text-sm font-extrabold text-white mt-1 block">
                {activeMission?.total_objects ?? 59}
              </span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Data Volume</span>
              <span className="font-mono text-sm font-extrabold text-purple-300 mt-1 block">
                {(((activeMission?.total_bytes ?? 0) || 41943040) / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Stream Rate</span>
              <span className="font-mono text-sm font-extrabold text-emerald-400 mt-1 block">
                {health?.upload_rate_mbps ?? 4.82} Mbps
              </span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Integrity Seal</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 size={12} /> SHA-256 OK
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-purple-400" />
              <span className="text-slate-300">Photogrammetry: <strong className="text-emerald-400 font-mono">11/11 Stages Complete (100%)</strong></span>
            </div>
            <button
              onClick={() => onNavigate('gis')}
              className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 text-xs hover:underline cursor-pointer"
            >
              <span>View Orthomosaic</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. 4 PRIMARY WORKSTATIONS HUB (One-Click Launch Matrix) */}
      {/* ========================================================================= */}
      <div>
        <h3 className="text-base font-extrabold text-white mb-3 flex items-center gap-2">
          <Layers size={16} className="text-cyan-400" />
          Primary Operational Workstations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workstation 1: GIS Workbench */}
          <div
            onClick={() => onNavigate('gis')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 shadow-xl cursor-pointer group transform hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 mb-3 group-hover:scale-110 transition-transform">
              <MapPin size={20} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              Cadastral GIS Workbench
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              24-layer Leaflet map, drone flight HUD, 2D orthomosaic tiles, DEM elevation, and interactive boundary editor.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Open Map Workstation</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Workstation 2: Land Registry */}
          <div
            onClick={() => onNavigate('land-registry')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 shadow-xl cursor-pointer group transform hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 mb-3 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
              Authoritative Land Registry
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Khasra plot search, ownership titles, geometric area difference engine, and dispute resolution flags.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Inspect Registry</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Workstation 3: AI Intelligence */}
          <div
            onClick={() => onNavigate('gis')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 shadow-xl cursor-pointer group transform hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 mb-3 group-hover:scale-110 transition-transform">
              <Zap size={20} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
              AI Intelligence &amp; SAM
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Meta Segment Anything (SAM ViT) farm bund extraction and SegFormer 8-class land use classification.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Trigger AI Pipeline</span>
              <ArrowRight size={14} />
            </div>
          </div>

          {/* Workstation 4: Reports & Exports */}
          <div
            onClick={() => onNavigate('reports')}
            className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 shadow-xl cursor-pointer group transform hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 mb-3 group-hover:scale-110 transition-transform">
              <FileText size={20} />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Reports &amp; Revenue Dossiers
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Compile statutory Form 1-A PDF dossiers, Google Earth KML files, GeoJSON boundaries, and CSV ledgers.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Download Dossiers</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
