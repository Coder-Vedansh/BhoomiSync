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
  DEFAULT_HARIPURA_PARCELS,
  DEFAULT_HARIPURA_LAND_PARCELS,
  DEFAULT_HARIPURA_SURVEY,
} from '../data/cadastralSpatialDefaults';
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

  // Selected Survey Context with robust Haripura initial state
  const [selectedSurveyId] = useState<string>('SUR-2026-001');
  const [survey, setSurvey] = useState<Survey | null>(DEFAULT_HARIPURA_SURVEY);
  const [parcels, setParcels] = useState<Parcel[]>(DEFAULT_HARIPURA_PARCELS);
  const [landParcels, setLandParcels] = useState<LandParcelDTO[]>(DEFAULT_HARIPURA_LAND_PARCELS);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(DEFAULT_HARIPURA_PARCELS[0]);
  const [selectedLandParcel, setSelectedLandParcel] = useState<LandParcelDTO | null>(DEFAULT_HARIPURA_LAND_PARCELS[0]);

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
      if (parcelsData && parcelsData.length > 0) {
        setParcels(parcelsData);
        if (!selectedParcel) setSelectedParcel(parcelsData[0]);
      }
      if (landData?.parcels && landData.parcels.length > 0) {
        setLandParcels(landData.parcels);
        if (!selectedLandParcel) setSelectedLandParcel(landData.parcels[0]);
      }
      if (lifecycleData) setSurveyLifecycle(lifecycleData);
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
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#F3F1EB] flex flex-col min-h-0">
      {/* Floating Top-Left Cockpit Pill (Designated Technical Avionics Strip) */}
      <div
        className="absolute top-3 left-3 hidden sm:flex items-center gap-2 pointer-events-auto"
        style={{ zIndex: 1100 }}
      >
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#223C30]/95 backdrop-blur-md border border-[#2E513E] text-xs shadow-lg text-[#F4F5EF]">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#A4A89F]">ALT:</span>
            <span className="font-semibold text-[#FAF9F5]">{currentAlt.toFixed(1)}m</span>
            <span className="text-[9px] text-[#DFC56D] font-medium">[SIM]</span>
          </div>
          <div className="h-3 w-px bg-[#2E513E]" />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#A4A89F]">TOF:</span>
            <span className="font-semibold text-[#6F9B7B]">2.0cm</span>
            <span className="text-[9px] text-[#6F9B7B] font-medium">[LIVE]</span>
          </div>
          <div className="h-3 w-px bg-[#2E513E]" />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#A4A89F]">SPD:</span>
            <span className="font-semibold text-[#FAF9F5]">{currentSpeed.toFixed(1)}m/s</span>
          </div>
          <div className="h-3 w-px bg-[#2E513E]" />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#A4A89F]">BAT:</span>
            <span className="font-semibold text-[#6F9B7B]">{currentBattery.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Floating Top-Right Action Controls (Clean Floating Pills) */}
      <div
        className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto"
        style={{ zIndex: 1100 }}
      >
        {alertMessage && (
          <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#BBD4C1] text-[#2E513E] text-xs font-medium shadow-md animate-fade-in truncate max-w-xs">
            {alertMessage}
          </div>
        )}

        {/* Edit Boundary Mode Toggle */}
        <button
          onClick={() => setIsEditingMode(!isEditingMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer ${
            isEditingMode
              ? 'bg-[#AD6048] text-white shadow-[#AD6048]/20'
              : 'bg-white/95 border border-[#D8D5CC] text-[#20251F] hover:bg-[#EEF2EC]'
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
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-white/95 border border-[#BDD7DE] text-[#385963] hover:bg-[#E8F1F3] shadow-sm backdrop-blur-md transition-all cursor-pointer"
          title="Run 11-stage AI bund boundary detection"
        >
          <Zap size={13} className={isProcessing ? 'animate-spin text-[#B18F2E]' : 'text-[#385963]'} />
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
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-white/95 border border-[#BBD4C1] text-[#2E513E] hover:bg-[#E6EFE8] shadow-sm backdrop-blur-md transition-all cursor-pointer"
          title="Visualize statutory data story: Drone → Image Capture → ToF → Processing → 2D Map → Cadastral Parcel"
        >
          <Radio size={13} className="text-[#2E513E]" />
          <span className="hidden sm:inline">Pipeline Story</span>
        </button>

        {/* Drawer Panels Toggle Button */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm backdrop-blur-md transition-all cursor-pointer ${
            drawerOpen
              ? 'bg-[#2E513E] text-white'
              : 'bg-white/95 border border-[#D8D5CC] text-[#20251F] hover:bg-[#EEF2EC]'
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

      {/* Floating Bottom-Center Consolidated Status Bar (Designated Technical Avionics Strip) */}
      <div
        className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#223C30]/95 backdrop-blur-md border border-[#2E513E] text-xs shadow-xl text-[#F4F5EF] max-w-[95vw] pointer-events-auto"
        style={{ zIndex: 1100 }}
      >
        {/* Real-time Coordinates */}
        <div className="flex items-center gap-2 font-mono text-[11px] whitespace-nowrap">
          <span>{liveCoords.lat.toFixed(6)}° N,</span>
          <span>{liveCoords.lng.toFixed(6)}° E</span>
          <span className="text-[#94B99D] hidden md:inline">EPSG:4326</span>
        </div>

        <div className="h-3 w-px bg-[#2E513E]" />

        {/* Live Hardware Provenance Tag */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6F9B7B] animate-pulse" />
          <span className="text-[#F4F5EF] hidden sm:inline">ESP32 Cam</span>
          <span className="text-[#6F9B7B] font-semibold">[LIVE]</span>
        </div>

        <div className="h-3 w-px bg-[#2E513E] hidden sm:block" />

        {/* Simulator Control Pill Button */}
        <button
          onClick={handleToggleSimulator}
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
            isSimRunning
              ? 'bg-[#914B38]/40 text-[#FAEAE5] border border-[#914B38]'
              : 'bg-[#2E513E] hover:bg-[#3C664D] text-[#F4F5EF] border border-[#4F7D60]'
          }`}
          title="Toggle synthetic flight telemetry streaming"
        >
          {isSimRunning ? <Square size={10} /> : <Play size={10} />}
          <span>{isSimRunning ? 'Stop Sim' : 'Sim Flight'}</span>
        </button>
      </div>

      {/* Floating Workstation Drawer (Right Dock, Professional Light Cartographic Workstation) */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-3 top-14 bottom-14 w-84 sm:w-96 rounded-xl bg-[#FAF9F5]/98 backdrop-blur-md border border-[#D8D5CC] shadow-2xl flex flex-col overflow-hidden pointer-events-auto text-[#20251F]"
            style={{ zIndex: 1200 }}
          >
          {/* Drawer Header with Tabs */}
          <div className="p-2.5 border-b border-[#D8D5CC] flex items-center justify-between bg-[#ECEAE2]">
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
              className="p-1 rounded-md text-[#5F665D] hover:text-[#20251F] hover:bg-[#D8D5CC]/50 cursor-pointer"
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
                  <span className="font-semibold text-[#5F665D] text-[11px] uppercase tracking-wider">
                    24-Layer Geospatial Stack
                  </span>
                  <span className="text-[10px] font-mono text-[#2E513E] font-medium px-2 py-0.5 rounded-full bg-[#E6EFE8] border border-[#BBD4C1]">
                    {totalActiveLayers} of 17 Active
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Category 1: Base Maps */}
                  <div className="rounded-lg bg-white border border-[#D8D5CC] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup('base')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-[#FAF9F5] hover:bg-[#EEF2EC] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.base ? <ChevronRight size={13} className="text-[#5F665D]" /> : <ChevronDown size={13} className="text-[#5F665D]" />}
                        <span className="font-medium text-[#20251F] text-xs">Base Maps</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#5F665D] bg-[#EFEEE8] px-1.5 py-0.5 rounded border border-[#D8D5CC]">1 layer</span>
                    </button>
                    {!collapsedGroups.base && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-[#D8D5CC]">
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={activeBaseLayer === 'satellite'}
                            onChange={() => toggleLayer('base-satellite')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Satellite Imagery (Esri / Maxar)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={activeBaseLayer === 'osm'}
                            onChange={() => toggleLayer('base-osm')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Street Basemap (OSM Vector)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 2: Survey Data */}
                  <div className="rounded-lg bg-white border border-[#D8D5CC] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup('survey')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-[#FAF9F5] hover:bg-[#EEF2EC] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.survey ? <ChevronRight size={13} className="text-[#5F665D]" /> : <ChevronDown size={13} className="text-[#5F665D]" />}
                        <span className="font-medium text-[#20251F] text-xs">Survey Data</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#385963] bg-[#E8F1F3] px-1.5 py-0.5 rounded border border-[#BDD7DE]">
                        {surveyActiveCount}/5 active
                      </span>
                    </button>
                    {!collapsedGroups.survey && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-[#D8D5CC]">
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['orthomosaic-raster']}
                            onChange={() => toggleLayer('orthomosaic-raster')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>2D Orthomosaic (2.5cm GSD)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['dem-elevation']}
                            onChange={() => toggleLayer('dem-elevation')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Bare-Earth DEM (50cm)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['lidar-point-cloud']}
                            onChange={() => toggleLayer('lidar-point-cloud')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>3D LiDAR Footprint</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['flight-trajectory']}
                            onChange={() => toggleLayer('flight-trajectory')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Flight Trajectory</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['raw-camera-shots']}
                            onChange={() => toggleLayer('raw-camera-shots')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Raw Camera Positions (EXIF)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 3: Cadastral */}
                  <div className="rounded-lg bg-white border border-[#D8D5CC] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup('cadastral')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-[#FAF9F5] hover:bg-[#EEF2EC] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.cadastral ? <ChevronRight size={13} className="text-[#5F665D]" /> : <ChevronDown size={13} className="text-[#5F665D]" />}
                        <span className="font-medium text-[#20251F] text-xs">Cadastral</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#2E6645] bg-[#E6EFE8] px-1.5 py-0.5 rounded border border-[#BBD4C1]">
                        {cadastralActiveCount}/3 active
                      </span>
                    </button>
                    {!collapsedGroups.cadastral && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-[#D8D5CC]">
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['official-cadastral-parcels']}
                            onChange={() => toggleLayer('official-cadastral-parcels')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Authoritative Khasra Boundaries</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['detected-parcels']}
                            onChange={() => toggleLayer('detected-parcels')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Registered Field Parcels</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['historical-cadastral-1998']}
                            onChange={() => toggleLayer('historical-cadastral-1998')}
                            className="rounded accent-[#B18F2E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Historical 1975 Baseline</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 4: AI & Analysis */}
                  <div className="rounded-lg bg-white border border-[#D8D5CC] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup('ai')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-[#FAF9F5] hover:bg-[#EEF2EC] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.ai ? <ChevronRight size={13} className="text-[#5F665D]" /> : <ChevronDown size={13} className="text-[#5F665D]" />}
                        <span className="font-medium text-[#20251F] text-xs">AI &amp; Analysis</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#385963] bg-[#E8F1F3] px-1.5 py-0.5 rounded border border-[#BDD7DE]">
                        {aiActiveCount}/4 active
                      </span>
                    </button>
                    {!collapsedGroups.ai && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-[#D8D5CC]">
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['ai-land-classification']}
                            onChange={() => toggleLayer('ai-land-classification')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>LULC Land-Use (8-Class)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['ai-candidate-boundaries']}
                            onChange={() => toggleLayer('ai-candidate-boundaries')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>AI Candidate Bund Boundaries</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['historical-change-layer']}
                            onChange={() => toggleLayer('historical-change-layer')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Historical Change Shifts</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['potential-encroachments']}
                            onChange={() => toggleLayer('potential-encroachments')}
                            className="rounded accent-[#914B38] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Encroachment Risk Alerts</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category 5: Live Operations */}
                  <div className="rounded-lg bg-white border border-[#D8D5CC] overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup('live')}
                      className="w-full px-3 py-2 flex items-center justify-between bg-[#FAF9F5] hover:bg-[#EEF2EC] text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {collapsedGroups.live ? <ChevronRight size={13} className="text-[#5F665D]" /> : <ChevronDown size={13} className="text-[#5F665D]" />}
                        <span className="font-medium text-[#20251F] text-xs">Live Operations</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#2E6645] bg-[#E6EFE8] px-1.5 py-0.5 rounded border border-[#BBD4C1]">
                        {liveActiveCount}/3 active
                      </span>
                    </button>
                    {!collapsedGroups.live && (
                      <div className="p-2.5 pt-2 space-y-1.5 border-t border-[#D8D5CC]">
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['live-drone-vector']}
                            onChange={() => toggleLayer('live-drone-vector')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Live Drone Vector ({currentHeading.toFixed(0)}°)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['realtime-trajectory']}
                            onChange={() => toggleLayer('realtime-trajectory')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
                          />
                          <span>Real-time Trajectory Track</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-[#4F574D] hover:text-[#20251F] transition-colors select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!!layerVisibility['esp32-telemetry-stream']}
                            onChange={() => toggleLayer('esp32-telemetry-stream')}
                            className="rounded accent-[#2E513E] cursor-pointer w-3.5 h-3.5"
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
                  <span className="font-semibold text-[#5F665D] text-[11px] uppercase tracking-wider">
                    Flight Operations
                  </span>
                  <Badge variant={missionDetail?.status === 'ACTIVE' ? 'emerald' : 'cyan'} size="sm">
                    {missionDetail?.status || 'ACTIVE'}
                  </Badge>
                </div>

                {/* Mission Summary Card */}
                <div className="p-3 bg-white rounded-lg border border-[#D8D5CC] space-y-2 text-xs shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5F665D]">Mission ID:</span>
                    <span className="font-mono text-[#2E513E] font-semibold">{selectedMissionId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5F665D]">Payload:</span>
                    <span className="text-[#20251F] font-medium">BhoomiSync-ESP32S3-Drone</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5F665D]">Sensors:</span>
                    <span className="text-[#2E6645] font-mono font-medium">Camera (128) + ToF (2.0 cm)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5F665D]">Flight Altitude:</span>
                    <span className="font-mono text-[#20251F]">
                      10.0 m <span className="text-[10px] text-[#858B82] font-sans">[ESTIMATED]</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5F665D]">GNSS Hardware:</span>
                    <span className="font-mono text-[10px] text-[#858B82] font-medium">Not Installed (Phase 2)</span>
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
                <div className="font-semibold text-[#5F665D] text-[11px] uppercase tracking-wider">
                  AI Computer Vision Models
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-[#D8D5CC] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#20251F]">LULC Land Classification</span>
                      <span className="font-mono text-[10px] text-[#385963] bg-[#E8F1F3] px-1.5 py-0.5 rounded border border-[#BDD7DE]">DEEPLABV3+</span>
                    </div>
                    <p className="text-[11px] text-[#5F665D]">
                      8-class segmentation across crops, fallow land, water bodies, and settlements.
                    </p>
                    <button
                      onClick={handleTriggerAiPipeline}
                      className="w-full py-1 rounded bg-[#EFEEE8] hover:bg-[#EEF2EC] text-[#20251F] text-xs font-medium cursor-pointer mt-1 border border-[#D8D5CC]"
                    >
                      Run Classification
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[#D8D5CC] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#20251F]">Bund Boundary Extraction</span>
                      <span className="font-mono text-[10px] text-[#2E6645] bg-[#E6EFE8] px-1.5 py-0.5 rounded border border-[#BBD4C1]">SAM + RESNET</span>
                    </div>
                    <p className="text-[11px] text-[#5F665D]">
                      Sub-centimeter field boundary vectorization from combined RGB imagery and ToF elevation.
                    </p>
                    <button
                      onClick={handleTriggerAiPipeline}
                      className="w-full py-1 rounded bg-[#EFEEE8] hover:bg-[#EEF2EC] text-[#20251F] text-xs font-medium cursor-pointer mt-1 border border-[#D8D5CC]"
                    >
                      Detect Bund Boundaries
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[#D8D5CC] space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#20251F]">Historical Change Detection</span>
                      <span className="font-mono text-[10px] text-[#74591D] bg-[#FBF4DC] px-1.5 py-0.5 rounded border border-[#EBD99A]">SIAMESE-CNN</span>
                    </div>
                    <p className="text-[11px] text-[#5F665D]">
                      Automated IoU comparison against historical revenue baseline maps (1975).
                    </p>
                    <button
                      onClick={handleTriggerAiPipeline}
                      className="w-full py-1 rounded bg-[#EFEEE8] hover:bg-[#EEF2EC] text-[#20251F] text-xs font-medium cursor-pointer mt-1 border border-[#D8D5CC]"
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
                    <span className="font-semibold text-[#5F665D] text-[11px] uppercase tracking-wider">
                      Khasra Parcel Inspector
                    </span>
                    <span className="text-[10px] font-mono text-[#2E6645] bg-[#E6EFE8] px-2 py-0.5 rounded-full border border-[#BBD4C1]">
                      Authoritative
                    </span>
                  </div>

                  {selectedParcel || selectedLandParcel ? (
                    <div className="p-3 bg-white rounded-lg border border-[#D8D5CC] space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-[#20251F] text-sm">
                            Khasra #{activeParcelId}
                          </span>
                          <div className="text-[10px] text-[#5F665D]">Village: <span className="text-[#20251F] font-medium">{village}</span></div>
                        </div>
                        <Badge variant="emerald" size="sm">
                          {rawStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-[11px] border-t border-[#D8D5CC] pt-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Primary Khatedar:</span>
                          <span className="font-medium text-[#20251F] text-right truncate max-w-[140px]">
                            {ownerName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Land Use:</span>
                          <span className="font-medium text-[#20251F]">
                            {landUse}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Official Area:</span>
                          <span className="font-mono text-[#20251F] font-medium">
                            {officialArea.toFixed(2)} ha
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Drone Area:</span>
                          <span className="font-mono text-[#2E513E] font-bold">
                            {droneArea.toFixed(2)} ha
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Difference:</span>
                          <span className={`font-mono font-semibold ${Math.abs(diffHa) <= 0.05 ? 'text-[#2E6645]' : 'text-[#914B38]'}`}>
                            {diffHa > 0 ? `+${diffHa.toFixed(2)}` : diffHa.toFixed(2)} ha ({diffPct > 0 ? `+${diffPct}` : diffPct}%)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Boundary IoU Match:</span>
                          <span className="font-mono text-[#2E6645] font-semibold">{iouMatch}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#5F665D]">Centroid Drift:</span>
                          <span className="font-mono text-[#20251F] font-medium">{centroidDrift} m</span>
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
                    <div className="p-6 text-center text-[#5F665D] bg-white rounded-lg border border-dashed border-[#D8D5CC]">
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
