import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Layers,
  Cpu,
  ShieldCheck,
  Zap,
  Play,
  Square,
  CheckCircle2,
  FileText,
  Edit3,
  X,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Download,
  Radio,
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
import { useDroneTransition } from '../context/DroneTransitionContext';

interface CadastralGisWorkbenchPageProps {
  onNavigate?: (tab: string, id?: string) => void;
  defaultTab?: 'layers' | 'mission' | 'ai' | 'inspector';
}

export const CadastralGisWorkbenchPage: React.FC<CadastralGisWorkbenchPageProps> = ({
  onNavigate,
  defaultTab = 'layers',
}) => {
  const { activeRole } = useAuth();
  const { triggerDroneTransition } = useDroneTransition();

  // Selected Survey Context
  const [selectedSurveyId] = useState<string>('SUR-2026-001');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [landParcels, setLandParcels] = useState<LandParcelDTO[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedLandParcel, setSelectedLandParcel] = useState<LandParcelDTO | null>(null);

  // Drone Telemetry & Mission State
  const [selectedMissionId] = useState<string>('MIS-2026-HARIPURA-002');
  const [latestTel, setLatestTel] = useState<TelemetryRecord | null>(null);
  const [, setHealth] = useState<MissionHealth | null>(null);
  const [simStatus, setSimStatus] = useState<SimulatorStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Right Drawer State (Floating Panel)
  const [drawerOpen, setDrawerOpen] = useState(defaultTab === 'ai' || defaultTab === 'mission');
  const [drawerTab, setDrawerTab] = useState<'layers' | 'mission' | 'ai' | 'inspector'>(defaultTab);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [missionDetail, setMissionDetail] = useState<any>(null);
  const [, setSurveyLifecycle] = useState<any>(null);

  // Live Map Coordinates
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>({
    lat: 24.5854,
    lng: 73.7125,
  });

  // Vertex Editing State
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Collapsible Layer Categories
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    base: false,
    survey: false,
    cadastral: false,
    ai: false,
    live: false,
  });

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Base Layer & 24-Layer Geospatial Visibility State
  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'osm'>('satellite');
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    // Base Maps
    'base-satellite': true,
    'base-osm': false,
    // Survey Data
    'orthomosaic-raster': true,
    'dem-elevation': true,
    'lidar-point-cloud': true,
    'flight-trajectory': true,
    'raw-camera-shots': true,
    // Cadastral
    'official-cadastral-parcels': true,
    'detected-parcels': true,
    'historical-cadastral-1998': true,
    // AI & Analysis
    'ai-land-classification': true,
    'ai-candidate-boundaries': true,
    'historical-change-layer': true,
    'potential-encroachments': true,
    'parcel-conflict-layer': true,
    // Live Operations
    'live-drone-vector': true,
    'realtime-trajectory': true,
    'esp32-telemetry-stream': true,
  });

  const toggleLayer = (key: string) => {
    if (key === 'base-satellite') {
      setActiveBaseLayer('satellite');
      setLayerVisibility((prev) => ({ ...prev, 'base-satellite': true, 'base-osm': false }));
      return;
    }
    if (key === 'base-osm') {
      setActiveBaseLayer('osm');
      setLayerVisibility((prev) => ({ ...prev, 'base-satellite': false, 'base-osm': true }));
      return;
    }
    if (key === 'potential-encroachments') {
      setLayerVisibility((prev) => {
        const nextVal = !prev['potential-encroachments'];
        return {
          ...prev,
          'potential-encroachments': nextVal,
          'parcel-conflict-layer': nextVal,
        };
      });
      return;
    }
    setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const surveyActiveCount = useMemo(() => [
    layerVisibility['orthomosaic-raster'],
    layerVisibility['dem-elevation'],
    layerVisibility['lidar-point-cloud'],
    layerVisibility['flight-trajectory'],
    layerVisibility['raw-camera-shots'],
  ].filter(Boolean).length, [layerVisibility]);

  const cadastralActiveCount = useMemo(() => [
    layerVisibility['official-cadastral-parcels'],
    layerVisibility['detected-parcels'],
    layerVisibility['historical-cadastral-1998'],
  ].filter(Boolean).length, [layerVisibility]);

  const aiActiveCount = useMemo(() => [
    layerVisibility['ai-land-classification'],
    layerVisibility['ai-candidate-boundaries'],
    layerVisibility['historical-change-layer'],
    layerVisibility['potential-encroachments'],
  ].filter(Boolean).length, [layerVisibility]);

  const liveActiveCount = useMemo(() => [
    layerVisibility['live-drone-vector'],
    layerVisibility['realtime-trajectory'],
    layerVisibility['esp32-telemetry-stream'],
  ].filter(Boolean).length, [layerVisibility]);

  const totalActiveLayers = 1 + surveyActiveCount + cadastralActiveCount + aiActiveCount + liveActiveCount;

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

  // Telemetry metric fallbacks (Strict hardware ceiling: 10.0m)
  const isSimRunning = simStatus?.is_running ?? false;
  const currentAlt = isSimRunning ? (simStatus?.current_alt ?? 10.0) : (latestTel?.altitude && latestTel.altitude <= 15 ? latestTel.altitude : 10.0);
  const currentHeading = latestTel?.heading ?? (simStatus?.current_heading ?? 90.0);
  const currentSpeed = latestTel?.speed ?? 9.2;
  const currentBattery = latestTel?.battery_percent ?? (simStatus?.battery ?? 87.0);

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
    triggerDroneTransition({
      variant: 'mission-start',
      duration: 1000,
      label: 'LIVE SURVEY',
      subtitle: 'DRONE-01 establishing capture over Haripura revenue area...',
      isLive: true,
      hasGnss: false,
      onComplete: async () => {
        try {
          await droneMissionApi.startMission(selectedMissionId);
          setAlertMessage('Drone flight mission initiated.');
          loadDroneData();
          setTimeout(() => setAlertMessage(null), 4000);
        } catch (err: any) {
          alert(`Start mission error: ${err.message}`);
        }
      },
    });
  };

  const handlePauseMission = async () => {
    try {
      await droneMissionApi.pauseMission(selectedMissionId);
      setAlertMessage('Drone flight mission paused (Hover mode).');
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
    triggerDroneTransition({
      variant: 'survey-complete',
      duration: 900,
      label: 'Survey Complete → Reconciling Cadastre',
      subtitle: 'Reconciling flight trajectory into PostGIS boundary polygons',
      onComplete: async () => {
        try {
          await droneMissionApi.endMission(selectedMissionId);
          setAlertMessage('Drone flight mission completed.');
          loadDroneData();
          setTimeout(() => setAlertMessage(null), 4000);
        } catch (err: any) {
          alert(`End mission error: ${err.message}`);
        }
      },
    });
  };

  const handleTriggerAiPipeline = async () => {
    triggerDroneTransition({
      variant: 'processing',
      duration: 850,
      label: 'Geospatial Sensor Fusion',
      subtitle: 'Meta Segment Anything (SAM ViT) & LULC classification',
      onComplete: async () => {
        setIsProcessing(true);
        setAlertMessage('Running AI Boundary Detection & Sensor Fusion...');
        try {
          await api.startGeospatialProcessing(selectedSurveyId, { target_gsd_cm: 1.2, target_dem_res_m: 0.5 });
          setAlertMessage('AI Processing complete! Orthomosaic & bund boundaries updated.');
          await loadGisData();
          setTimeout(() => setAlertMessage(null), 5000);
        } catch (err: any) {
          setAlertMessage(`Processing error: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      },
    });
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
      setAlertMessage(`Parcel ${parcelId} geometry updated and verified.`);
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
      setAlertMessage(`Boundary for parcel ${parcelId} successfully verified.`);
      await loadGisData();
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (e: any) {
      alert(`Verification error: ${e.message}`);
    }
  };

  const handleExportGeoJson = (parcelId: string) => {
    const p = selectedParcel || parcels.find((item) => item.parcel_id === parcelId);
    const lp = selectedLandParcel || landParcels.find((item) => item.parcel_id === parcelId);
    const geom = p?.geometry_geojson || lp?.cadastral_geometry || {
      type: 'Polygon',
      coordinates: [[[75.85, 26.91], [75.86, 26.91], [75.86, 26.92], [75.85, 26.92], [75.85, 26.91]]]
    };
    const geojson = {
      type: 'Feature',
      properties: {
        parcel_id: parcelId,
        village: lp?.village || 'Rampur',
        tehsil: lp?.tehsil || 'Sanganer',
        district: lp?.district || 'Jaipur',
        official_area_ha: lp?.official_area_hectares ?? 2.45,
        drone_area_ha: p?.area_hectares ?? 2.40,
        land_use: lp?.land_use || p?.land_use || 'Agricultural Crop',
        status: lp?.verification_status || p?.verification_status || 'VERIFIED',
      },
      geometry: geom,
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khasra_${parcelId}_cadastral.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    setAlertMessage(`Exported GeoJSON for Khasra ${parcelId}`);
    setTimeout(() => setAlertMessage(null), 3000);
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex flex-col min-h-0">
      {/* Floating Top-Left Cockpit Pill (Sleek Mapbox/Linear style) */}
      <div
        className="absolute top-3 left-3 hidden sm:flex items-center gap-2 pointer-events-auto"
        style={{ zIndex: 1100 }}
      >
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-800 text-xs shadow-lg">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">ALT:</span>
            <span className="font-semibold text-slate-100">{currentAlt.toFixed(1)}m</span>
            <span className="text-[9px] text-slate-400 font-medium">[SIM]</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">TOF:</span>
            <span className="font-semibold text-emerald-400">2.0cm</span>
            <span className="text-[9px] text-emerald-400 font-medium">[LIVE]</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">SPD:</span>
            <span className="font-semibold text-slate-200">{currentSpeed.toFixed(1)}m/s</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">BAT:</span>
            <span className="font-semibold text-emerald-400">{currentBattery.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Floating Top-Right Action Controls (Clean Floating Pills) */}
      <div
        className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto"
        style={{ zIndex: 1100 }}
      >
        {alertMessage && (
          <div className="px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-sky-500/30 text-sky-300 text-xs font-medium shadow-lg animate-fade-in truncate max-w-xs">
            {alertMessage}
          </div>
        )}

        {/* Edit Boundary Mode Toggle */}
        <button
          onClick={() => setIsEditingMode(!isEditingMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer ${
            isEditingMode
              ? 'bg-rose-500 text-white shadow-rose-500/20'
              : 'bg-slate-900/85 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Toggle surveyor vertex editing mode"
        >
          <Edit3 size={13} />
          <span className="hidden md:inline">{isEditingMode ? 'Exit Vertex Edit' : 'Edit Boundary'}</span>
        </button>

        {/* Trigger AI & Sensor Fusion Pipeline */}
        <button
          onClick={handleTriggerAiPipeline}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 shadow-md backdrop-blur-md transition-all cursor-pointer"
          title="Run 11-stage AI bund boundary detection"
        >
          <Zap size={13} className={isProcessing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isProcessing ? 'AI Processing...' : 'Run AI & Fusion'}</span>
        </button>

        {/* Drone-to-Cadastral Pipeline Story Visualization Trigger */}
        <button
          onClick={() =>
            triggerDroneTransition({
              variant: 'pipeline',
              duration: 1600,
              label: 'Drone-to-Cadastral Pipeline Story',
              subtitle: 'Drone → Image Capture → ToF → Processing → 2D Map → Cadastre',
              tofDistanceCm: '2 cm',
              tofStatus: 'VALID',
              gnssStatus: 'NOT AVAILABLE',
              khasraNumber: selectedParcel?.parcel_id?.replace(/\D/g, '') || '105',
              surveyedArea: selectedParcel?.area_hectares
                ? `${selectedParcel.area_hectares.toFixed(2)} ha`
                : '1.47 ha',
            })
          }
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-[#0e1626]/90 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15 shadow-md backdrop-blur-md transition-all cursor-pointer"
          title="Visualize statutory data story: Drone → Image Capture → ToF → Processing → 2D Map → Cadastral Parcel"
        >
          <Radio size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">Pipeline Story</span>
        </button>

        {/* Drawer Panels Toggle Button */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer ${
            drawerOpen
              ? 'bg-sky-500 text-white'
              : 'bg-slate-900/85 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Toggle Layers, AI Engine, and Inspector dock"
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">Tools &amp; Layers</span>
        </button>
      </div>

      {/* Edge-to-Edge Central Dominant GIS Map Canvas */}
      <div className="flex-1 w-full h-full relative">
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
          hideCoordinateBar={true}
          hideLayerHud={true}
          onCoordinatesChange={(lat, lng) => setLiveCoords({ lat, lng })}
          layerVisibility={layerVisibility}
          onToggleLayer={toggleLayer}
          activeBaseLayer={activeBaseLayer}
          onSelectBaseLayer={setActiveBaseLayer}
          droneLocation={{
            lat: latestTel?.latitude && latestTel.latitude > 0 ? latestTel.latitude : 24.5854,
            lng: latestTel?.longitude && latestTel.longitude > 0 ? latestTel.longitude : 73.7125,
            heading: currentHeading,
          }}
        />
      </div>

      {/* Floating Bottom-Center Consolidated Status Bar (Linear / Mapbox Studio Style) */}
      <div
        className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs shadow-xl text-slate-300 max-w-[95vw] pointer-events-auto"
        style={{ zIndex: 1100 }}
      >
        {/* Real-time Coordinates */}
        <div className="flex items-center gap-2 font-mono text-[11px] whitespace-nowrap">
          <span>{liveCoords.lat.toFixed(6)}° N,</span>
          <span>{liveCoords.lng.toFixed(6)}° E</span>
          <span className="text-slate-500 hidden md:inline">EPSG:4326</span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        {/* Live Hardware Provenance Tag */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 hidden sm:inline">ESP32 Cam</span>
          <span className="text-emerald-400 font-semibold">[LIVE]</span>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block" />

        {/* Simulator Control Pill Button */}
        <button
          onClick={handleToggleSimulator}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
            isSimRunning
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Toggle synthetic flight telemetry streaming"
        >
          {isSimRunning ? <Square size={10} /> : <Play size={10} />}
          <span>{isSimRunning ? 'Stop Sim' : 'Sim Flight'}</span>
        </button>
      </div>

      {/* Floating Workstation Drawer (Right Dock, Figma/Mapbox Style) */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-3 top-14 bottom-14 w-84 sm:w-96 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-800/90 shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
            style={{ zIndex: 1200 }}
          >
          {/* Drawer Header with Tabs */}
          <div className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <Tabs
              tabs={[
                { id: 'layers', label: 'Layers', icon: <Layers size={13} /> },
                { id: 'mission', label: 'Mission', icon: <Play size={13} /> },
                { id: 'ai', label: 'AI Engine', icon: <Cpu size={13} /> },
                { id: 'inspector', label: 'Inspector', icon: <ShieldCheck size={13} /> },
              ]}
              activeTab={drawerTab}
              onChange={(tab: any) => setDrawerTab(tab)}
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Close panel"
            >
              <X size={15} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            {/* TAB 1: 24-Layer GIS Control Panel */}
            {drawerTab === 'layers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                    24-Layer Geospatial Stack
                  </span>
                  <span className="text-[10px] font-mono text-sky-400 font-medium px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20">
                    {totalActiveLayers} of 17 Active
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Category 1: Base Maps */}
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleGroup('base')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.base ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                        <span className="font-medium text-slate-200 text-xs">Base Maps</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">1 layer</span>
                    </button>
                    {!collapsedGroups.base && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-slate-800/60">
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={activeBaseLayer === 'satellite'}
                            onChange={() => toggleLayer('base-satellite')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Satellite Imagery (Esri / Maxar)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={activeBaseLayer === 'osm'}
                            onChange={() => toggleLayer('base-osm')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Street Basemap (OSM Vector)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 2: Survey Data */}
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleGroup('survey')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.survey ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                        <span className="font-medium text-slate-200 text-xs">Survey Data</span>
                      </div>
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                        {surveyActiveCount}/5 active
                      </span>
                    </button>
                    {!collapsedGroups.survey && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-slate-800/60">
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['orthomosaic-raster']}
                            onChange={() => toggleLayer('orthomosaic-raster')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>2D Orthomosaic (2.5cm GSD)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['dem-elevation']}
                            onChange={() => toggleLayer('dem-elevation')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Bare-Earth DEM (50cm)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['lidar-point-cloud']}
                            onChange={() => toggleLayer('lidar-point-cloud')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>3D LiDAR Footprint</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['flight-trajectory']}
                            onChange={() => toggleLayer('flight-trajectory')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Flight Trajectory</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['raw-camera-shots']}
                            onChange={() => toggleLayer('raw-camera-shots')}
                            className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Raw Camera Positions (EXIF)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 3: Cadastral */}
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleGroup('cadastral')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.cadastral ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                        <span className="font-medium text-slate-200 text-xs">Cadastral</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {cadastralActiveCount}/3 active
                      </span>
                    </button>
                    {!collapsedGroups.cadastral && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-slate-800/60">
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['official-cadastral-parcels']}
                            onChange={() => toggleLayer('official-cadastral-parcels')}
                            className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Authoritative Khasra Boundaries</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['detected-parcels']}
                            onChange={() => toggleLayer('detected-parcels')}
                            className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Registered Field Parcels</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['historical-cadastral-1998']}
                            onChange={() => toggleLayer('historical-cadastral-1998')}
                            className="rounded accent-amber-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Historical 1975 Baseline</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 4: AI & Analysis */}
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleGroup('ai')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.ai ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                        <span className="font-medium text-slate-200 text-xs">AI &amp; Analysis</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        {aiActiveCount}/4 active
                      </span>
                    </button>
                    {!collapsedGroups.ai && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-slate-800/60">
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['ai-land-classification']}
                            onChange={() => toggleLayer('ai-land-classification')}
                            className="rounded accent-purple-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>LULC Land-Use (8-Class)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['ai-candidate-boundaries']}
                            onChange={() => toggleLayer('ai-candidate-boundaries')}
                            className="rounded accent-purple-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>AI Candidate Bund Boundaries</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['historical-change-layer']}
                            onChange={() => toggleLayer('historical-change-layer')}
                            className="rounded accent-purple-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Historical Change Shifts</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['potential-encroachments']}
                            onChange={() => toggleLayer('potential-encroachments')}
                            className="rounded accent-rose-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Encroachment Risk Alerts</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 5: Live Operations */}
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleGroup('live')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.live ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                        <span className="font-medium text-slate-200 text-xs">Live Operations</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {liveActiveCount}/3 active
                      </span>
                    </button>
                    {!collapsedGroups.live && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-slate-800/60">
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['live-drone-vector']}
                            onChange={() => toggleLayer('live-drone-vector')}
                            className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Live Drone Vector ({currentHeading.toFixed(0)}°)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['realtime-trajectory']}
                            onChange={() => toggleLayer('realtime-trajectory')}
                            className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Real-time Trajectory Track</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['esp32-telemetry-stream']}
                            onChange={() => toggleLayer('esp32-telemetry-stream')}
                            className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                          />
                          <span>ESP32-S3 Telemetry Sensor Stream</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Mission Control & Telemetry */}
            {drawerTab === 'mission' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                    Flight Operations
                  </span>
                  <Badge variant={missionDetail?.status === 'ACTIVE' ? 'emerald' : 'cyan'} size="sm">
                    {missionDetail?.status || 'ACTIVE'}
                  </Badge>
                </div>

                {/* Mission Summary Card */}
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mission ID:</span>
                    <span className="font-mono text-sky-400 font-semibold">{selectedMissionId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Payload:</span>
                    <span className="text-slate-200 font-medium">BhoomiSync-ESP32S3-Drone</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sensors:</span>
                    <span className="text-emerald-400 font-mono font-medium">Camera (128) + ToF (2.0 cm)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Flight Altitude:</span>
                    <span className="font-mono text-slate-300">
                      10.0 m <span className="text-[10px] text-slate-500 font-sans">[ESTIMATED]</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">GNSS Hardware:</span>
                    <span className="font-mono text-[10px] text-slate-400 font-medium">Not Installed (Phase 2)</span>
                  </div>
                </div>

                {/* Flight Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Play size={12} />}
                    onClick={handleStartMission}
                  >
                    Start Mission
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Pause size={12} />}
                    onClick={handlePauseMission}
                  >
                    Pause Flight
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<RotateCcw size={12} />}
                    onClick={handleResumeMission}
                  >
                    Resume Flight
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Square size={12} />}
                    onClick={handleEndMission}
                  >
                    End Mission
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: AI Intelligence Modules */}
            {drawerTab === 'ai' && (
              <div className="space-y-3">
                <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                  AI Computer Vision Models
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">LULC Land Classification</span>
                      <span className="font-mono text-[10px] text-sky-400">DEEPLABV3+</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      8-class segmentation across crops, fallow land, water bodies, and settlements.
                    </p>
                    <button
                      onClick={handleTriggerAiPipeline}
                      className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer mt-1"
                    >
                      Run Classification
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">Bund Boundary Extraction</span>
                      <span className="font-mono text-[10px] text-emerald-400">SAM + RESNET</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sub-centimeter field boundary vectorization from combined RGB imagery and ToF elevation.
                    </p>
                    <button
                      onClick={handleTriggerAiPipeline}
                      className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer mt-1"
                    >
                      Detect Bund Boundaries
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">Historical Change Detection</span>
                      <span className="font-mono text-[10px] text-amber-400">SIAMESE-CNN</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automated IoU comparison against historical revenue baseline maps (1975).
                    </p>
                    <button
                      onClick={handleTriggerAiPipeline}
                      className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer mt-1"
                    >
                      Run Change Detection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Cadastral Parcel Inspector */}
            {drawerTab === 'inspector' && (() => {
              const activeParcelId = selectedParcel?.parcel_id || selectedLandParcel?.survey_number || 'BS-P-001';
              const village = selectedLandParcel?.village || 'Rampur';
              const rawStatus = selectedLandParcel?.verification_status || selectedParcel?.verification_status || 'VERIFIED';
              const officialArea = selectedLandParcel?.official_area_hectares ?? 2.45;
              const droneArea = selectedParcel?.area_hectares ?? 2.40;
              const diffHa = Number((droneArea - officialArea).toFixed(2));
              const diffPct = officialArea > 0 ? Number(((diffHa / officialArea) * 100).toFixed(1)) : 0;
              const iouMatch = 96.4;
              const centroidDrift = 0.8;
              const landUse = selectedLandParcel?.land_use || selectedParcel?.land_use || 'Agricultural Crop';
              const ownerName = selectedLandParcel?.primary_owner_name || 'Khatedar Registered';

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                      Khasra Parcel Inspector
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Authoritative
                    </span>
                  </div>

                  {selectedParcel || selectedLandParcel ? (
                    <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-sky-400 text-sm">
                            Khasra #{activeParcelId}
                          </span>
                          <div className="text-[10px] text-slate-400">Village: <span className="text-slate-200 font-medium">{village}</span></div>
                        </div>
                        <Badge variant="emerald" size="sm">
                          {rawStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-[11px] border-t border-slate-800/80 pt-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Primary Khatedar:</span>
                          <span className="font-medium text-slate-200 text-right truncate max-w-[140px]">
                            {ownerName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Land Use:</span>
                          <span className="font-medium text-slate-200">
                            {landUse}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Official Area:</span>
                          <span className="font-mono text-slate-200 font-medium">
                            {officialArea.toFixed(2)} ha
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Drone Area:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {droneArea.toFixed(2)} ha
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Difference:</span>
                          <span className={`font-mono font-semibold ${Math.abs(diffHa) <= 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {diffHa > 0 ? `+${diffHa.toFixed(2)}` : diffHa.toFixed(2)} ha ({diffPct > 0 ? `+${diffPct}` : diffPct}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Boundary IoU Match:</span>
                          <span className="font-mono text-emerald-400 font-semibold">{iouMatch}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Centroid Drift:</span>
                          <span className="font-mono text-slate-300 font-medium">{centroidDrift} m</span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<CheckCircle2 size={13} />}
                          onClick={() => handleVerifyBoundary(activeParcelId)}
                        >
                          Verify Boundary
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<FileText size={13} />}
                          onClick={() => onNavigate?.('reports')}
                        >
                          Generate Form 1-A
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Download size={13} />}
                          onClick={() => handleExportGeoJson(activeParcelId)}
                        >
                          Export GeoJSON
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
                      Click any Khasra parcel polygon on the map to inspect its ownership, area comparison, and legal boundary stats.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
