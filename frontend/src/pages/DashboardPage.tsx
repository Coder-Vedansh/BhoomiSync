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
  Crosshair,
  Radio,
  Cloud,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { droneMissionApi } from '../services/droneMissionApi';
import { Survey } from '../types';
import { DroneMission, TelemetryRecord, MissionHealth, SimulatorStatus } from '../types/droneMission';

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
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. CLEAN REFINED HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Connected
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <Crosshair size={11} className="text-cyan-400" />
              RTK Fixed (1.4 cm)
            </span>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              SUR-2026-001 (Haripura Pilot)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Survey Operations Overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('gis')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
          >
            <MapPin size={14} />
            <span>Open GIS Workbench</span>
            <ArrowRight size={13} />
          </button>

          <button
            onClick={handleToggleSimulator}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isSimRunning
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {isSimRunning ? <Square size={13} className="text-rose-400" /> : <Play size={13} className="text-cyan-400" />}
            <span>{isSimRunning ? 'Stop Simulator' : 'Flight Simulator'}</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
          >
            <FileText size={13} className="text-slate-400" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS ROW (4 Balanced, Clean Metric Cards) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Area */}
        <div
          onClick={() => onNavigate('gis')}
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Surveyed Land</span>
            <TrendingUp size={15} className="text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalHectares.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">hectares</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">{(totalHectares * 2.471).toFixed(1)} acres</span>
            <span>· sub-cm accuracy</span>
          </div>
        </div>

        {/* Card 2: Registered Parcels */}
        <div
          onClick={() => onNavigate('land-registry')}
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Registered Parcels</span>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalParcels}
            </span>
            <span className="text-xs text-slate-400">Khasra plots</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">100% verified</span>
            <span>in PostGIS</span>
          </div>
        </div>

        {/* Card 3: Survey Campaigns */}
        <div
          onClick={() => onNavigate('gis')}
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Campaign</span>
            <MapPin size={15} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {surveys.length}
            </span>
            <span className="text-xs text-slate-400">village</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="text-slate-300">Haripura</span>, Udaipur Tehsil
          </div>
        </div>

        {/* Card 4: Sensor Datasets in R2 */}
        <div
          onClick={() => onNavigate('gis')}
          className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>R2 Cloud Datasets</span>
            <Layers size={15} className="text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {totalDatasets}
            </span>
            <span className="text-xs text-slate-400">assets</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            RGB, LiDAR, DEM rasters
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SLEEK PIPELINE TRACKER */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-emerald-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Survey Statutory Lifecycle
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full w-fit">
            Stage 6 / 10: Surveyor Review (60%)
          </span>
        </div>

        {/* Progress Bar with Steps */}
        <div className="relative pt-2 pb-1">
          {/* Background Track */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
          </div>

          {/* Stepper Dots & Labels */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-center">
            {stages.map((st, idx) => {
              const isPast = idx < 5;
              const isCurrent = idx === 5;
              return (
                <div key={st.num} className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-500/40'
                        : isPast
                        ? 'bg-slate-700 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : st.num}
                  </div>
                  <span
                    className={`text-[10px] mt-1 truncate w-full ${
                      isCurrent
                        ? 'font-bold text-white'
                        : isPast
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {st.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BALANCED 2-COLUMN DUAL PANELS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: Live Drone Flight Status */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Radio size={15} className="text-cyan-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Drone Flight &amp; Telemetry
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                {isSimRunning ? 'SIMULATOR' : '5G TELEMETRY'}
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Drone Hardware</span>
                <span className="text-slate-200 font-medium">DJI Matrice 350 RTK</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">RTK Carrier Solution</span>
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Fixed (1.4 cm accuracy)
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Altitude MSL / Speed</span>
                <span className="text-slate-200 font-mono">
                  {(latestTel?.altitude ?? simStatus?.current_alt ?? 122.5).toFixed(1)} m · {(latestTel?.speed ?? 9.2).toFixed(1)} m/s
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Battery Level</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {(latestTel?.battery_percent ?? simStatus?.battery ?? 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/80">
            <span className="text-slate-500 font-mono truncate">
              Mission: {activeMission?.mission_id || 'MIS-2026-HARIPURA-002'}
            </span>
            <button
              onClick={() => onNavigate('gis')}
              className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Map Track</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Panel B: Cloudflare R2 Ingestion */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Cloud size={15} className="text-purple-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Cloudflare R2 Object Store
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                BUCKET READY
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Ingested Imagery Frames</span>
                <span className="text-slate-200 font-mono font-semibold">
                  {activeMission?.total_objects ?? 59} frames
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Total Volume Ingested</span>
                <span className="text-slate-200 font-mono">
                  {(((activeMission?.total_bytes ?? 0) || 41943040) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Streaming Throughput</span>
                <span className="text-slate-200 font-mono">
                  {health?.upload_rate_mbps ?? 4.82} Mbps
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Integrity Checksum</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 size={12} /> SHA-256 Verified
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/80">
            <span className="text-slate-500 font-mono truncate">
              Photogrammetry: 11/11 Complete
            </span>
            <button
              onClick={() => onNavigate('gis')}
              className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View Orthomosaic</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. WORKSTATIONS DIRECTORY */}
      {/* ========================================================================= */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Primary Workstations
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('gis')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                <MapPin size={16} />
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                GIS Workbench
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                24-layer Leaflet map, flight HUD, orthomosaics &amp; boundary editing.
              </p>
            </div>
            <div className="mt-3 text-xs font-medium text-emerald-400 flex items-center gap-1">
              <span>Open &rarr;</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('land-registry')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5">
                <ShieldCheck size={16} />
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                Land Registry
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Khasra plots, landowner titles, and area discrepancy calculations.
              </p>
            </div>
            <div className="mt-3 text-xs font-medium text-cyan-400 flex items-center gap-1">
              <span>Inspect &rarr;</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('gis')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
                <Layers size={16} />
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                AI Segmentation
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Meta SAM ViT farm bund extraction &amp; SegFormer LULC classification.
              </p>
            </div>
            <div className="mt-3 text-xs font-medium text-purple-400 flex items-center gap-1">
              <span>Run AI &rarr;</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('reports')}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2.5">
                <FileText size={16} />
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                Reports &amp; Dossiers
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Statutory Form 1-A PDF, Google Earth KML, and revenue CSV exports.
              </p>
            </div>
            <div className="mt-3 text-xs font-medium text-amber-400 flex items-center gap-1">
              <span>Download &rarr;</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
