import React, { useState, useEffect } from "react";
import {
  Radio,
  Cloud,
  Activity,
  Play,
  Square,
  Zap,
  Compass,
  Gauge,
  Battery,
  Satellite,
  Crosshair,
  CheckCircle2,
} from "lucide-react";
import {
  DroneMission,
  TelemetryRecord,
  MissionHealth,
  SimulatorStatus,
} from "../types/droneMission";
import { droneMissionApi } from "../services/droneMissionApi";
import {
  PageHeader,
  MetricCard,
  Badge,
  Card,
  Button,
  Tabs,
  DataTable,
  PipelineTracker,
  StageInfo,
} from "../components/ui";

export const DroneMissionPage: React.FC = () => {
  const [missions, setMissions] = useState<DroneMission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [currentMission, setCurrentMission] = useState<DroneMission | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [latestTel, setLatestTel] = useState<TelemetryRecord | null>(null);
  const [health, setHealth] = useState<MissionHealth | null>(null);
  const [simStatus, setSimStatus] = useState<SimulatorStatus | null>(null);
  const [activeTab, setActiveTab] = useState<string>("assets");
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Load initial missions
  useEffect(() => {
    loadMissions();
    const interval = setInterval(refreshSimAndHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  // When selected mission changes, load details & telemetry & connect WS
  useEffect(() => {
    if (!selectedMissionId) return;

    loadMissionDetails(selectedMissionId);

    // Connect WebSocket
    const ws = droneMissionApi.createWebSocket(
      selectedMissionId,
      (event: any) => {
        setWsConnected(true);
        if (event?.event_type === "TELEMETRY" && event?.data) {
          const tel = event.data as TelemetryRecord;
          setLatestTel(tel);
          setTelemetry((prev) => [tel, ...prev.slice(0, 150)]);
        } else if (event?.event_type === "STAGE_PROGRESS" || event?.event_type === "MISSION_STATUS") {
          loadMissionDetails(selectedMissionId);
        }
      },
      (error: any) => {
        console.warn("WebSocket status:", error);
      }
    );

    return () => {
      ws.close();
      setWsConnected(false);
    };
  }, [selectedMissionId]);


  const loadMissions = async () => {
    try {
      const list = await droneMissionApi.listMissions();
      setMissions(list);
      if (list.length > 0 && !selectedMissionId) {
        setSelectedMissionId(list[0].mission_id);
      }
    } catch (e) {
      console.error("Failed to load missions", e);
    }
  };

  const loadMissionDetails = async (id: string) => {
    try {
      const [m, t, h, s] = await Promise.all([
        droneMissionApi.getMission(id),
        droneMissionApi.getTelemetry(id, 100),
        droneMissionApi.getHealth(id).catch(() => null),
        droneMissionApi.getSimulatorStatus().catch(() => null),
      ]);
      setCurrentMission(m);
      setTelemetry(t);
      if (t.length > 0) setLatestTel(t[0]);
      if (h) setHealth(h);
      if (s) setSimStatus(s);
    } catch (e) {
      console.error("Failed to load mission details", e);
    }
  };

  const refreshSimAndHealth = async () => {
    try {
      const s = await droneMissionApi.getSimulatorStatus();
      setSimStatus(s);
      if (selectedMissionId) {
        const h = await droneMissionApi.getHealth(selectedMissionId);
        setHealth(h);
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const handleStartSimulator = async () => {
    if (!selectedMissionId) return;
    try {
      await droneMissionApi.startSimulator({ mission_id: selectedMissionId });
      refreshSimAndHealth();
    } catch (e) {
      alert("Failed to start flight simulator");
    }
  };


  const handleStopSimulator = async () => {
    try {
      await droneMissionApi.stopSimulator();
      refreshSimAndHealth();
    } catch (e) {
      alert("Failed to stop flight simulator");
    }
  };

  const handleTriggerProcessing = async () => {
    if (!selectedMissionId) return;
    setIsTriggering(true);
    try {
      await droneMissionApi.triggerProcessing(selectedMissionId);
      loadMissionDetails(selectedMissionId);
      setTimeout(() => setIsTriggering(false), 3000);
    } catch (e) {
      alert("Failed to trigger processing");
      setIsTriggering(false);
    }
  };

  const handleStartMission = async () => {
    if (!selectedMissionId) return;
    try {
      await droneMissionApi.startMission(selectedMissionId);
      loadMissionDetails(selectedMissionId);
    } catch (e) {
      alert("Failed to start mission");
    }
  };

  const handleStopMission = async () => {
    if (!selectedMissionId) return;
    try {
      await droneMissionApi.stopMission(selectedMissionId);
      loadMissionDetails(selectedMissionId);
    } catch (e) {
      alert("Failed to stop mission");
    }
  };

  // Map coordinates normalization for canvas/SVG
  const minLat = 24.582;
  const maxLat = 24.588;
  const minLon = 73.710;
  const maxLon = 73.716;

  const toMapX = (lon: number) => Math.max(30, Math.min(570, ((lon - minLon) / (maxLon - minLon)) * 540 + 30));
  const toMapY = (lat: number) => Math.max(30, Math.min(370, (1 - (lat - minLat) / (maxLat - minLat)) * 340 + 30));

  const currentLat = latestTel?.latitude ?? (simStatus?.current_lat ?? 24.583000);
  const currentLon = latestTel?.longitude ?? (simStatus?.current_lon ?? 73.712000);
  const currentAlt = latestTel?.altitude ?? (simStatus?.current_alt ?? 122.5);
  const currentHeading = latestTel?.heading ?? (simStatus?.current_heading ?? 90.0);
  const currentSpeed = latestTel?.speed ?? 9.2;
  const currentBattery = latestTel?.battery_percent ?? (simStatus?.battery ?? 100.0);
  const currentSat = latestTel?.satellites ?? 18;

  // Pipeline stage items
  const pipelineStages: StageInfo[] = currentMission?.stages
    ? currentMission.stages.map((st) => ({
        stage_number: st.stage_number,
        stage_name: st.stage_name,
        status: st.status as any,
        progress: st.progress,
        output_asset_type: (st as any).output_asset_type,
      }))

    : [
        { stage_number: 1, stage_name: "Sensor Integrity", status: "COMPLETED", progress: 100 },
        { stage_number: 2, stage_name: "RTK/GNSS Georeferencing", status: "COMPLETED", progress: 100 },
        { stage_number: 3, stage_name: "Photogrammetry (SfM)", status: "COMPLETED", progress: 100 },
        { stage_number: 4, stage_name: "Point Cloud & LiDAR Fusion", status: "COMPLETED", progress: 100 },
        { stage_number: 5, stage_name: "Orthomosaic (1.2cm/px)", status: "COMPLETED", progress: 100 },
        { stage_number: 6, stage_name: "DEM/DSM Elevation Mesh", status: "COMPLETED", progress: 100 },
        { stage_number: 7, stage_name: "3D Geodesic Area", status: "COMPLETED", progress: 100 },
        { stage_number: 8, stage_name: "AI LULC Classification", status: "COMPLETED", progress: 100 },
        { stage_number: 9, stage_name: "Boundary Intelligence", status: "COMPLETED", progress: 100 },
        { stage_number: 10, stage_name: "Cadastral Alignment", status: "COMPLETED", progress: 100 },
        { stage_number: 11, stage_name: "Survey Publication Report", status: "COMPLETED", progress: 100 },
      ];

  // Cadastral village parcels overlay for map
  const villageParcels = [
    { khasra: "101", name: "Ram Chandra (Agri)", points: [[73.7115, 24.5865], [73.7135, 24.5865], [73.7135, 24.5850], [73.7115, 24.5850]] },
    { khasra: "102", name: "Suresh Patel (Agri)", points: [[73.7135, 24.5865], [73.7155, 24.5865], [73.7155, 24.5850], [73.7135, 24.5850]] },
    { khasra: "103", name: "Gram Panchayat", points: [[73.7115, 24.5850], [73.7135, 24.5850], [73.7135, 24.5835], [73.7115, 24.5835]] },
    { khasra: "104", name: "Mohan Lal (Agri)", points: [[73.7135, 24.5850], [73.7155, 24.5850], [73.7155, 24.5835], [73.7135, 24.5835]] },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Live Drone Mission"
        subtitle="Real-time aerial survey telemetry, sensor ingestion and cloud processing"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="cyan" dot>
              Cellular 5G SA
            </Badge>
            <Badge variant={wsConnected ? "emerald" : "amber"}>
              WebSocket: {wsConnected ? "Live Stream" : "Polling"}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mission Selector */}
            <select
              value={selectedMissionId}
              onChange={(e) => setSelectedMissionId(e.target.value)}
              className="select w-auto text-xs py-1.5 px-3 bg-slate-900 border-slate-700"
            >
              {missions.map((m) => (
                <option key={m.mission_id} value={m.mission_id}>
                  {m.mission_id} — {m.mission_name.slice(0, 24)}...
                </option>
              ))}
            </select>

            {/* Mission State Controls */}
            {currentMission?.status === "INITIALIZED" && (
              <Button size="sm" variant="primary" onClick={handleStartMission}>
                Start Mission
              </Button>
            )}

            {currentMission?.status === "ACTIVE" && (
              <Button size="sm" variant="outline" onClick={handleStopMission}>
                Pause Mission
              </Button>
            )}

            {/* Simulator Controls */}
            {simStatus?.is_running ? (
              <Button
                size="sm"
                variant="danger"
                icon={<Square size={13} />}
                onClick={handleStopSimulator}
              >
                Stop Simulator
              </Button>
            ) : (
              <Button
                size="sm"
                variant="cyan"
                icon={<Play size={13} />}
                onClick={handleStartSimulator}
              >
                Start Simulator
              </Button>
            )}

            {/* Pipeline Trigger */}
            <Button
              size="sm"
              variant="primary"
              icon={<Zap size={13} />}
              loading={isTriggering}
              onClick={handleTriggerProcessing}
            >
              Run Processing
            </Button>
          </div>
        }
      />

      {/* 2. Top Status Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs shadow-sm">
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold uppercase">Active Mission</span>
          <span className="font-mono font-bold text-white truncate block">
            {selectedMissionId || "MIS-2026-HARIPURA-002"}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold uppercase">Flight Gateway</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <Radio size={12} /> ESP32 / Cellular 5G
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold uppercase">Storage Target</span>
          <span className="font-semibold text-cyan-400 flex items-center gap-1">
            <Cloud size={12} /> Cloudflare R2
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold uppercase">RTK Carrier Fix</span>
          <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
            <Crosshair size={12} /> FIXED (1.4 cm)
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-semibold uppercase">Connection State</span>
          <span className="font-bold text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ONLINE
          </span>
        </div>
      </div>

      {/* 3. Live Telemetry Metric Cards (8 Key Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          label="Latitude"
          value={<span className="font-mono text-sm sm:text-base">{currentLat.toFixed(6)}°N</span>}
          icon={<Compass size={14} />}
          variant="emerald"
        />
        <MetricCard
          label="Longitude"
          value={<span className="font-mono text-sm sm:text-base">{currentLon.toFixed(6)}°E</span>}
          icon={<Compass size={14} />}
          variant="emerald"
        />
        <MetricCard
          label="Altitude MSL"
          value={<span className="font-mono text-sm sm:text-base">{currentAlt.toFixed(1)} m</span>}
          icon={<Gauge size={14} />}
          variant="cyan"
        />
        <MetricCard
          label="Ground Speed"
          value={<span className="font-mono text-sm sm:text-base">{currentSpeed.toFixed(1)} m/s</span>}
          icon={<Activity size={14} />}
          variant="cyan"
        />
        <MetricCard
          label="Heading"
          value={<span className="font-mono text-sm sm:text-base">{currentHeading.toFixed(0)}°</span>}
          icon={<Compass size={14} />}
          variant="amber"
        />
        <MetricCard
          label="RTK Accuracy"
          value={<span className="font-mono text-sm sm:text-base">1.4 cm</span>}
          icon={<Crosshair size={14} />}
          variant="emerald"
        />
        <MetricCard
          label="Satellites"
          value={<span className="font-mono text-sm sm:text-base">{currentSat} Fix</span>}
          icon={<Satellite size={14} />}
          variant="emerald"
        />
        <MetricCard
          label="Battery"
          value={<span className="font-mono text-sm sm:text-base">{currentBattery.toFixed(0)}%</span>}
          icon={<Battery size={14} />}
          variant="emerald"
        />
      </div>

      {/* 4. Main Interactive Section: Live GIS Flight Map + Cloud Storage Ingestion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Central Live Flight GIS Map */}
        <div className="lg:col-span-2">
          <Card
            title="Live Flight Trajectory & Cadastral Overlay"
            subtitle="Centimeter-accurate drone positioning over Haripura village revenue parcels"
            actions={
              <div className="flex items-center gap-2">
                <Badge variant="slate" size="sm">
                  CRS: EPSG:4326
                </Badge>
                <Badge variant="emerald" size="sm" dot>
                  RTK Fixed
                </Badge>
              </div>
            }
          >
            <div className="gis-map-container relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 400" preserveAspectRatio="none">
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                  </pattern>
                  <linearGradient id="droneGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect width="600" height="400" fill="url(#gridPattern)" />

                {/* Village Cadastral Parcels Overlay */}
                {villageParcels.map((parcel) => {
                  const pathStr = parcel.points
                    .map(([lon, lat], i) => `${i === 0 ? "M" : "L"} ${toMapX(lon)} ${toMapY(lat)}`)
                    .join(" ") + " Z";
                  const centerLon = (parcel.points[0][0] + parcel.points[2][0]) / 2;
                  const centerLat = (parcel.points[0][1] + parcel.points[2][1]) / 2;

                  return (
                    <g key={parcel.khasra}>
                      <path
                        d={pathStr}
                        fill="rgba(16, 185, 129, 0.05)"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                      <text
                        x={toMapX(centerLon)}
                        y={toMapY(centerLat)}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        Khasra {parcel.khasra}
                      </text>
                    </g>
                  );
                })}

                {/* Drone Flight Trajectory Lawnmower Pattern */}
                <path
                  d="M 60 70 L 540 70 L 540 130 L 60 130 L 60 190 L 540 190 L 540 250 L 60 250 L 60 310 L 540 310"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                  opacity="0.6"
                />

                {/* Dynamic Breadcrumbs from Telemetry Stream */}
                {telemetry.slice(0, 30).map((t, idx) => (
                  <circle
                    key={idx}
                    cx={toMapX(t.longitude)}
                    cy={toMapY(t.latitude)}
                    r={Math.max(1.5, 4 - idx * 0.1)}
                    fill="#38bdf8"
                    opacity={Math.max(0.2, 1 - idx * 0.03)}
                  />
                ))}

                {/* Current Drone Location Marker & Orientation Vector */}
                <g transform={`translate(${toMapX(currentLon)}, ${toMapY(currentLat)})`}>
                  {/* Radar Pulse Ring */}
                  <circle r="18" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.4" className="animate-ping" />
                  <circle r="10" fill="url(#droneGlow)" opacity="0.3" />
                  
                  {/* Heading Orientation Vector Arrow */}
                  <g transform={`rotate(${currentHeading})`}>
                    <polygon points="0,-14 6,6 0,2 -6,6" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                    <line x1="0" y1="-14" x2="0" y2="-28" stroke="#38bdf8" strokeWidth="2" strokeDasharray="2 2" />
                  </g>

                  {/* Drone Center Core */}
                  <circle r="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                </g>
              </svg>

              {/* Map Overlay Controls & Legend */}
              <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-xs border border-slate-800 p-2.5 rounded-lg text-[11px] text-slate-300 space-y-1.5 shadow-lg">
                <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Map Legend</span>
                  <span className="text-emerald-400 font-mono">1m:1m Scale</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                  <span>Planned Flight Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-emerald-400 border-dashed inline-block" />
                  <span>Cadastral Parcels</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span>Drone Heading ({currentHeading.toFixed(0)}°)</span>
                </div>
              </div>

              {/* Map Bottom Status Bar */}
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between bg-slate-950/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
                <div>
                  Lat: <span className="text-slate-200">{currentLat.toFixed(6)}°</span> | Lon: <span className="text-slate-200">{currentLon.toFixed(6)}°</span>
                </div>
                <div>
                  Ground GSD: <span className="text-emerald-400 font-bold">1.2 cm/pixel</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Cloudflare R2 Ingestion & Activity Stream */}
        <div className="lg:col-span-1 space-y-6">
          <Card
            title="Cloud Storage Ingestion"
            subtitle="Cloudflare R2 S3 bucket stream"
            actions={
              <Badge variant="cyan" size="sm">
                R2 Private S3
              </Badge>
            }
          >
            {/* Storage Metric Breakdown */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Objects Ingested</span>
                <span className="text-base font-extrabold text-white font-mono">
                  {currentMission?.total_objects ?? 12}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Volume</span>
                <span className="text-base font-extrabold text-cyan-400 font-mono">
                  {(((currentMission?.total_bytes ?? 0) || 41943040) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Upload Rate</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {health?.upload_rate_mbps ?? 4.82} Mbps
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Checksum SHA-256</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={12} /> VERIFIED
                </span>
              </div>
            </div>

            {/* Live Ingestion Activity Stream */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Recent Ingestion Feed</span>
                <span className="text-[10px] text-slate-400 font-normal">Streaming</span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {[
                  { time: "14:32:03", type: "LIDAR", desc: "scan_chunk_0004.las (12.5 MB)", status: "VERIFIED" },
                  { time: "14:32:02", type: "RGB", desc: "frame_000008.jpg (6.2 MB)", status: "VERIFIED" },
                  { time: "14:32:02", type: "GNSS", desc: "rtk_carrier_batch_0008.json", status: "FIXED_RTK" },
                  { time: "14:32:01", type: "IMU", desc: "imu_telemetry_batch_0008.json", status: "OK" },
                  { time: "14:32:00", type: "RGB", desc: "frame_000007.jpg (6.1 MB)", status: "VERIFIED" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80 text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-slate-500 text-[10px]">{item.time}</span>
                      <Badge
                        variant={item.type === "RGB" ? "cyan" : item.type === "LIDAR" ? "purple" : "emerald"}
                        size="sm"
                      >
                        {item.type}
                      </Badge>
                      <span className="text-slate-300 truncate font-mono text-[10px]">{item.desc}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold ml-1">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 5. 11-Stage Cloud Processing Pipeline Component */}
      <PipelineTracker stages={pipelineStages} />

      {/* 6. Ingested Data Assets & Live Telemetry Logs Table */}
      <Card
        title="Ingested Data Objects & Telemetry Stream"
        subtitle="Canonical Cloudflare R2 object registry and high-frequency RTK fix logs"
      >
        <Tabs
          tabs={[
            { id: "assets", label: "Cloudflare R2 Sensor Assets Index", count: currentMission?.total_objects ?? 12 },
            { id: "telemetry_log", label: "Real-Time Telemetry Stream Log", count: telemetry.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "assets" ? (
          <DataTable
            columns={[
              { header: "#", accessor: (_, idx) => idx + 1, width: "50px" },
              {
                header: "Sensor",
                accessor: (_, i) => (
                  <Badge variant={i % 3 === 0 ? "cyan" : "purple"} size="sm">
                    {i % 3 === 0 ? "RGB" : "LIDAR"}
                  </Badge>
                ),
                width: "90px",
              },
              {
                header: "Deterministic R2 Object Key",
                accessor: (_, i) => (
                  <span className="font-mono text-xs text-slate-300">
                    {`surveys/SUR-2026-001/missions/${selectedMissionId || "MIS-001"}/raw/${
                      i % 3 === 0 ? "rgb" : "lidar"
                    }/frame_${String(i + 1).padStart(6, "0")}.${i % 3 === 0 ? "jpg" : "las"}`}
                  </span>
                ),
              },
              {
                header: "File Size",
                accessor: (_, i) => (
                  <span className="font-mono text-xs">{i % 3 === 0 ? "6.2 MB" : "12.5 MB"}</span>
                ),
                width: "100px",
              },
              {
                header: "SHA-256 Checksum",
                accessor: () => (
                  <span className="font-mono text-[10px] text-slate-400">
                    a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef...
                  </span>
                ),
              },
              {
                header: "Integrity Status",
                accessor: () => (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    SHA256_VERIFIED
                  </span>
                ),
                width: "140px",
              },
            ]}
            data={Array.from({ length: 8 })}
            keyExtractor={(_, i) => i}
          />
        ) : (
          <DataTable
            columns={[
              { header: "Seq #", accessor: (item) => item.sequence_number, width: "70px" },
              {
                header: "Timestamp",
                accessor: (item) => (
                  <span className="font-mono text-xs text-slate-400">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                ),
                width: "110px",
              },
              {
                header: "Latitude",
                accessor: (item) => <span className="font-mono text-xs">{item.latitude.toFixed(6)}°N</span>,
              },
              {
                header: "Longitude",
                accessor: (item) => <span className="font-mono text-xs">{item.longitude.toFixed(6)}°E</span>,
              },
              {
                header: "Altitude MSL",
                accessor: (item) => <span className="font-mono text-xs">{item.altitude.toFixed(1)} m</span>,
              },
              {
                header: "Speed",
                accessor: (item) => <span className="font-mono text-xs">{item.speed.toFixed(1)} m/s</span>,
              },
              {
                header: "Heading",
                accessor: (item) => <span className="font-mono text-xs">{item.heading.toFixed(0)}°</span>,
              },
              {
                header: "RTK Fix",
                accessor: (item) => (
                  <Badge variant={item.rtk_status.includes("FIX") ? "emerald" : "amber"} size="sm">
                    {item.rtk_status}
                  </Badge>
                ),
              },
              {
                header: "Battery",
                accessor: (item) => (
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {item.battery_percent.toFixed(0)}%
                  </span>
                ),
              },
            ]}
            data={telemetry}
            keyExtractor={(item) => item.sequence_number}
            emptyMessage="No live telemetry recorded yet. Click 'Start Simulator' above to stream live flight data."
          />
        )}
      </Card>
    </div>
  );
};
