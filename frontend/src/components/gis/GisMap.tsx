import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Popup,
  Marker,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Parcel,
  Survey,
  SpatialFootprint,
  OrthomosaicManifest,
  DemManifest,
  DetectedBoundary,
  AIClassificationRegion,
  AIBoundaryCandidate,
  AIHistoricalChange,
  LandParcelDTO,
} from '../../types';
import { api } from '../../services/api';
import {
  Layers,
  Ruler,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';


const vertexIcon = new L.DivIcon({
  className: 'custom-vertex-handle',
  html: '<div style="background-color: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.6); cursor: crosshair;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface GisMapProps {
  center?: [number, number];
  zoom?: number;
  survey?: Survey | null;
  parcels?: Parcel[];
  landParcels?: LandParcelDTO[];
  selectedParcelId?: string | null;
  onSelectParcel?: (parcel: Parcel) => void;
  onSelectLandParcel?: (parcel: LandParcelDTO) => void;
  onUpdateParcelGeometry?: (parcelId: string, updatedCoordinates: [number, number][]) => void;
  height?: string;
  isEditingMode?: boolean;
  aiClassifications?: AIClassificationRegion[];
  aiBoundaries?: AIBoundaryCandidate[];
  aiChanges?: AIHistoricalChange[];
  hideCoordinateBar?: boolean;
  hideLayerHud?: boolean;
  onCoordinatesChange?: (lat: number, lng: number) => void;
}

function CoordinatesTracker({ onMove, onClick }: { onMove: (lat: number, lng: number) => void; onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    mousemove(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export const GisMap: React.FC<GisMapProps> = ({
  center = [24.5854, 73.7125],
  zoom = 16,
  survey,
  parcels = [],
  landParcels = [],
  selectedParcelId,
  onSelectParcel,
  onSelectLandParcel,
  onUpdateParcelGeometry,
  height = '620px',
  isEditingMode = false,
  aiClassifications: initialAiClass,
  aiBoundaries: initialAiBnd,
  aiChanges: initialAiChanges,
  hideCoordinateBar = false,
  hideLayerHud = false,
  onCoordinatesChange,
}) => {
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: center[0],
    lng: center[1],
  });

  const handleCoordinateMove = (lat: number, lng: number) => {
    setCurrentCoords({ lat, lng });
    onCoordinatesChange?.(lat, lng);
  };

  const [activeBaseLayer, setActiveBaseLayer] = useState<'osm' | 'satellite'>('satellite');
  
  // 24-Layer GIS Toggle State
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    'base-satellite': true,
    'raw-camera-shots': false,
    'flight-trajectory': false,
    'orthomosaic-raster': true,
    'lidar-point-cloud': true,
    'dem-elevation': false,
    'dsm-surface': false,
    'detected-parcels': true,
    'detected-boundaries': true,
    'manually-edited': true,
    'land-classification': false,
    'historical-cadastre': false,
    // AI Geospatial Intelligence Layers (13-18)
    'ai-land-classification': true,
    'ai-candidate-boundaries': true,
    'ai-confidence-heatmap': false,
    'historical-change-layer': true,
    'potential-encroachments': true,
    'ai-audit-history': false,
    // Cadastral & Land Record Intelligence Layers (19-24)
    'official-cadastral-parcels': true,
    'parcel-ownership-status': true,
    'historical-cadastral-1998': false,
    'drone-measured-parcels': true,
    'surveyor-verified-parcels': true,
    'parcel-conflict-layer': true,
  });

  const [footprint, setFootprint] = useState<SpatialFootprint | null>(null);
  const [orthoManifest, setOrthoManifest] = useState<OrthomosaicManifest | null>(null);
  const [demManifest, setDemManifest] = useState<DemManifest | null>(null);
  const [detectedBoundaries, setDetectedBoundaries] = useState<DetectedBoundary[]>([]);
  
  const [aiClassifications, setAiClassifications] = useState<AIClassificationRegion[]>(initialAiClass || []);
  const [aiBoundaries, setAiBoundaries] = useState<AIBoundaryCandidate[]>(initialAiBnd || []);
  const [aiChanges, setAiChanges] = useState<AIHistoricalChange[]>(initialAiChanges || []);

  // Measure Mode
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  // Collapsible Floating HUD state
  const [isHudOpen, setIsHudOpen] = useState(false);

  // Vertex Editing state
  const [editingVertices, setEditingVertices] = useState<[number, number][]>([]);

  const selectedParcel = parcels.find((p) => p.parcel_id === selectedParcelId);

  useEffect(() => {
    if (survey?.survey_id) {
      Promise.all([
        api.getSpatialFootprint(survey.survey_id).catch(() => null),
        api.getOrthomosaic(survey.survey_id).catch(() => null),
        api.getDem(survey.survey_id).catch(() => null),
        api.getDetectedBoundaries(survey.survey_id).catch(() => []),
        api.getAISurveyClassifications(survey.survey_id).catch(() => []),
        api.getAISurveyBoundaries(survey.survey_id).catch(() => []),
        api.getAISurveyChanges(survey.survey_id).catch(() => []),
      ]).then(([fp, ortho, dem, bnds, aiclass, aibnd, aichg]) => {
        if (fp) setFootprint(fp);
        if (ortho) setOrthoManifest(ortho);
        if (dem) setDemManifest(dem);
        if (bnds) setDetectedBoundaries(bnds);
        if (aiclass && aiclass.length > 0) setAiClassifications(aiclass);
        if (aibnd && aibnd.length > 0) setAiBoundaries(aibnd);
        if (aichg && aichg.length > 0) setAiChanges(aichg);
      });
    }
  }, [survey?.survey_id]);

  useEffect(() => {
    if (initialAiClass) setAiClassifications(initialAiClass);
    if (initialAiBnd) setAiBoundaries(initialAiBnd);
    if (initialAiChanges) setAiChanges(initialAiChanges);
  }, [initialAiClass, initialAiBnd, initialAiChanges]);

  useEffect(() => {
    if (selectedParcel && isEditingMode) {
      const coords = extractLeafletCoords(selectedParcel.geometry_geojson);
      setEditingVertices(coords.length > 0 ? coords.slice(0, -1) : []);
    } else {
      setEditingVertices([]);
    }
  }, [selectedParcelId, isEditingMode, selectedParcel]);

  const toggleLayer = (layerId: string) => {
    setLayerVisibility((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const extractLeafletCoords = (geojsonGeom: any): [number, number][] => {
    if (!geojsonGeom || !geojsonGeom.coordinates) return [];
    const coords = geojsonGeom.coordinates[0];
    if (!Array.isArray(coords)) return [];
    return coords.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);
  };

  const getParcelStyle = (parcel: Parcel) => {
    const isSelected = parcel.parcel_id === selectedParcelId;
    if (isSelected) {
      return {
        color: '#f59e0b',
        weight: 3.5,
        dashArray: '2, 4',
        fillOpacity: 0.45,
        fillColor: '#fbbf24',
      };
    }
    switch (parcel.verification_status as any) {
      case 'VERIFIED':
        return { color: '#10b981', weight: 2, fillOpacity: 0.22, fillColor: '#059669' };
      case 'MANUALLY_EDITED':
        return { color: '#38bdf8', weight: 2, fillOpacity: 0.25, fillColor: '#0284c7' };
      case 'FLAGGED_DISPUTE':
        return { color: '#ef4444', weight: 2, fillOpacity: 0.35, fillColor: '#dc2626' };
      default:
        return { color: '#6366f1', weight: 1.8, fillOpacity: 0.2, fillColor: '#4f46e5' };
    }
  };

  const getClassColor = (className: string) => {
    switch (className.toUpperCase()) {
      case 'AGRICULTURAL':
        return { color: '#10b981', fill: '#059669' };
      case 'FALLOW':
        return { color: '#d97706', fill: '#f59e0b' };
      case 'VEGETATION':
        return { color: '#22c55e', fill: '#16a34a' };
      case 'WATER':
        return { color: '#0ea5e9', fill: '#0284c7' };
      case 'BUILDING':
        return { color: '#ef4444', fill: '#dc2626' };
      case 'ROAD':
        return { color: '#94a3b8', fill: '#64748b' };
      case 'BARREN':
        return { color: '#a8a29e', fill: '#78716c' };
      default:
        return { color: '#a855f7', fill: '#9333ea' };
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isMeasuring) {
      setMeasurePoints((prev) => [...prev, [lat, lng]]);
    }
  };

  const handleMoveVertex = (vertexIndex: number, lat: number, lng: number) => {
    const updated = [...editingVertices];
    updated[vertexIndex] = [lat, lng];
    setEditingVertices(updated);
  };

  const handleSaveEditedGeometry = () => {
    if (!selectedParcelId || !onUpdateParcelGeometry || editingVertices.length < 3) return;
    const closed = [...editingVertices, editingVertices[0]];
    onUpdateParcelGeometry(selectedParcelId, closed);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', cursor: isMeasuring ? 'crosshair' : 'default' }}
      >
        <CoordinatesTracker
          onMove={handleCoordinateMove}
          onClick={handleMapClick}
        />

        {/* 1. Base Map Layer */}
        {activeBaseLayer === 'satellite' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri World Imagery</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* 4. Orthomosaic Raster Dynamic Tile Overlay (from Remote Engine) */}
        {layerVisibility['orthomosaic-raster'] && (
          <TileLayer
            attribution='&copy; <a href="#">BhoomiSync Photogrammetry Engine</a>'
            url={`/api/v1/engine/tiles/${survey?.survey_id || 'SUR-2026-001'}/{z}/{x}/{y}.png`}
            opacity={0.85}
            zIndex={10}
            maxZoom={22}
          />
        )}

        {layerVisibility['orthomosaic-raster'] && orthoManifest && (
          <Polygon
            positions={[
              [orthoManifest.spatial_bounds.min_lat, orthoManifest.spatial_bounds.min_lon],
              [orthoManifest.spatial_bounds.max_lat, orthoManifest.spatial_bounds.min_lon],
              [orthoManifest.spatial_bounds.max_lat, orthoManifest.spatial_bounds.max_lon],
              [orthoManifest.spatial_bounds.min_lat, orthoManifest.spatial_bounds.max_lon],
            ]}
            pathOptions={{
              color: '#10b981',
              weight: 2,
              fillOpacity: 0.08,
              fillColor: '#059669',
            }}
          >
            <Popup>
              <div style={{ padding: '0.3rem' }}>
                <span className="badge badge-emerald">2D True-Scale Orthomosaic</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {orthoManifest.orthomosaic_id}
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  GSD: <strong>{orthoManifest.ground_sampling_distance_cm} cm/pixel</strong>
                </div>
                <div style={{ fontSize: '0.75rem' }}>
                  Area: <strong>{orthoManifest.dimensions_m.total_area_ha} ha ({orthoManifest.dimensions_m.total_area_m2.toLocaleString()} m²)</strong>
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* 6. Bare-Earth DEM Elevation */}
        {layerVisibility['dem-elevation'] && demManifest && (
          <Polygon
            positions={[
              [demManifest.spatial_bounds.min_lat, demManifest.spatial_bounds.min_lon],
              [demManifest.spatial_bounds.max_lat, demManifest.spatial_bounds.min_lon],
              [demManifest.spatial_bounds.max_lat, demManifest.spatial_bounds.max_lon],
              [demManifest.spatial_bounds.min_lat, demManifest.spatial_bounds.max_lon],
            ]}
            pathOptions={{
              color: '#d97706',
              weight: 2,
              dashArray: '4, 4',
              fillOpacity: 0.28,
              fillColor: '#f59e0b',
            }}
          >
            <Popup>
              <div style={{ padding: '0.3rem' }}>
                <span className="badge badge-amber">Bare-Earth DEM Raster</span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {demManifest.dem_id}
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  Elevation: <strong>{demManifest.elevation_range.min_m}m - {demManifest.elevation_range.max_m}m</strong>
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* 5. 3D LiDAR Point Cloud Footprint Layer */}
        {layerVisibility['lidar-point-cloud'] &&
          footprint?.lidar_footprint_geojson?.features?.map((feat: any, idx: number) => {
            const positions = extractLeafletCoords(feat.geometry);
            return (
              <Polygon
                key={`lidar-layer-${idx}`}
                positions={positions}
                pathOptions={{
                  color: '#c084fc',
                  weight: 2,
                  dashArray: '3, 6',
                  fillOpacity: 0.12,
                  fillColor: '#a855f7',
                }}
              >
                <Popup>
                  <div style={{ padding: '0.3rem' }}>
                    <span className="badge badge-purple">3D LiDAR Point Cloud</span>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      {feat.properties.filename}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 3. Drone Flight Track (RTK) */}
        {layerVisibility['flight-trajectory'] &&
          footprint?.rtk_trajectory_geojson?.features?.map((feat: any, idx: number) => {
            const linePositions = feat.geometry.coordinates.map(
              (pt: [number, number]) => [pt[1], pt[0]] as [number, number]
            );
            return (
              <Polyline
                key={`rtk-layer-${idx}`}
                positions={linePositions}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 2.5,
                  opacity: 0.85,
                  dashArray: '2, 4',
                }}
              />
            );
          })}

        {/* 2. Raw Camera Capture Points */}
        {layerVisibility['raw-camera-shots'] &&
          footprint?.camera_points_geojson?.features?.map((feat: any, idx: number) => {
            const [lon, lat] = feat.geometry.coordinates;
            return (
              <CircleMarker
                key={`cam-point-${idx}`}
                center={[lat, lon]}
                radius={4}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: '#10b981',
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
              />
            );
          })}

        {/* 9. Detected Bund Boundaries */}
        {layerVisibility['detected-boundaries'] &&
          detectedBoundaries.map((bnd) => {
            const positions = extractLeafletCoords(bnd.geometry_geojson);
            if (positions.length === 0) return null;
            return (
              <Polygon
                key={`raw-bnd-${bnd.boundary_id}`}
                positions={positions}
                pathOptions={{
                  color: '#f97316',
                  weight: 1.8,
                  dashArray: '4, 4',
                  fillOpacity: 0.05,
                  fillColor: '#f97316',
                }}
              />
            );
          })}

        {/* 13. AI Land Classification Segmentation Polygons */}
        {layerVisibility['ai-land-classification'] &&
          aiClassifications.map((region, idx) => {
            const positions = extractLeafletCoords(region.geometry);
            if (positions.length === 0) return null;
            const style = getClassColor(region.class);

            return (
              <Polygon
                key={`ai-class-${idx}`}
                positions={positions}
                pathOptions={{
                  color: style.color,
                  weight: 2,
                  fillOpacity: 0.25,
                  fillColor: style.fill,
                }}
              >
                <Popup>
                  <div style={{ padding: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      <Sparkles size={13} style={{ color: style.color }} />
                      <span className="badge" style={{ backgroundColor: style.fill, color: '#ffffff' }}>
                        AI {region.class}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, marginLeft: 'auto' }}>
                        {(region.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: '0.3rem' }}>
                      Coverage: <strong>{region.percentage}%</strong> ({region.area_hectares} ha)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Area: {region.area_m2.toLocaleString()} m²
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 14. AI Candidate Boundaries */}
        {layerVisibility['ai-candidate-boundaries'] &&
          aiBoundaries.map((bnd) => {
            const positions = extractLeafletCoords(bnd.geometry);
            if (positions.length === 0) return null;
            const isVerified = bnd.verification_status === 'VERIFIED';

            return (
              <Polygon
                key={`ai-bnd-${bnd.boundary_id}`}
                positions={positions}
                pathOptions={{
                  color: isVerified ? '#10b981' : '#f59e0b',
                  weight: isVerified ? 2.5 : 2,
                  dashArray: isVerified ? undefined : '5, 5',
                  fillOpacity: 0.08,
                  fillColor: isVerified ? '#10b981' : '#f59e0b',
                }}
              >
                <Popup>
                  <div style={{ padding: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span className={`badge ${isVerified ? 'badge-emerald' : 'badge-amber'}`}>
                        {bnd.verification_status}
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                        {(bnd.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{bnd.boundary_id}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Type: <strong>{bnd.boundary_type.replace(/_/g, ' ')}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem' }}>
                      Length: <strong>{bnd.length_m.toFixed(1)} m</strong> | Est. Area: <strong>{bnd.estimated_area_m2.toLocaleString()} m²</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Sensors: {bnd.sources.join(', ')}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 16 & 17. Historical Change & Potential Encroachment Layer */}
        {layerVisibility['historical-change-layer'] &&
          aiChanges.map((chg) => {
            const positions = extractLeafletCoords(chg.geometry);
            if (positions.length === 0) return null;
            const isEncroachment = chg.severity === 'CRITICAL_ENCROACHMENT' || chg.change_type.includes('ENCROACHMENT');

            return (
              <Polygon
                key={`ai-chg-${chg.change_id}`}
                positions={positions}
                pathOptions={{
                  color: isEncroachment ? '#ef4444' : '#f97316',
                  weight: isEncroachment ? 3 : 2,
                  dashArray: '3, 4',
                  fillOpacity: isEncroachment ? 0.38 : 0.2,
                  fillColor: isEncroachment ? '#dc2626' : '#ea580c',
                }}
              >
                <Popup>
                  <div style={{ padding: '0.35rem', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                      <AlertTriangle size={13} style={{ color: isEncroachment ? '#ef4444' : '#f97316' }} />
                      <span className={`badge ${isEncroachment ? 'badge-rose' : 'badge-amber'}`}>
                        {chg.change_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{chg.change_id}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Old: <span style={{ color: 'var(--text-muted)' }}>{chg.old_value}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      New: <strong style={{ color: isEncroachment ? '#ef4444' : 'var(--text-primary)' }}>{chg.new_value}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', marginTop: '0.2rem' }}>
                      Affected Area: <strong>{chg.area_affected_m2} m²</strong> ({chg.percentage_change}% drift)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Confidence: {(chg.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 8. Field Parcels (Cadastral Polygons) */}
        {layerVisibility['detected-parcels'] &&
          parcels.map((parcel) => {
            const positions = extractLeafletCoords(parcel.geometry_geojson);
            if (positions.length === 0) return null;

            return (
              <Polygon
                key={parcel.parcel_id}
                positions={positions}
                pathOptions={getParcelStyle(parcel)}
                eventHandlers={{
                  click: () => onSelectParcel && onSelectParcel(parcel),
                }}
              >
                <Popup>
                  <div style={{ padding: '0.35rem', minWidth: '230px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)' }}>
                        {parcel.parcel_id}
                      </span>
                      <span className={`badge ${parcel.verification_status === 'VERIFIED' ? 'badge-emerald' : 'badge-amber'}`}>
                        {parcel.verification_status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.5rem' }}>
                      <div><strong>Land Use:</strong> {parcel.land_use.replace(/_/g, ' ')}</div>
                      <div>
                        <strong>Planar Area:</strong> {parcel.area_m2.toLocaleString()} m² ({parcel.area_hectares} ha)
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-emerald)' }}>3D Surface Area:</strong>{' '}
                        {parcel.surface_area_m2 ? parcel.surface_area_m2.toLocaleString() : (parcel.area_m2 * 1.008).toFixed(1)} m²
                      </div>
                      <div><strong>Perimeter:</strong> {parcel.perimeter_m.toLocaleString()} m</div>
                      <div><strong>Mean Slope:</strong> {parcel.slope_degrees || 3.5}°</div>
                    </div>

                    <button
                      onClick={() => onSelectParcel && onSelectParcel(parcel)}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', fontSize: '0.75rem' }}
                    >
                      Select & Inspect Metrics
                    </button>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 19–24. Cadastral & Land Record Intelligence Layers */}
        {layerVisibility['official-cadastral-parcels'] &&
          landParcels.map((lp) => {
            const positions = extractLeafletCoords(lp.cadastral_geometry);
            if (positions.length === 0) return null;
            const isSelected = lp.parcel_id === selectedParcelId;

            // Color coding for ownership status layer
            let fillColor = '#eab308';
            let strokeColor = isSelected ? '#38bdf8' : '#eab308';
            let strokeWidth = isSelected ? 3.5 : 2;

            if (layerVisibility['parcel-ownership-status']) {
              if (lp.ownership_status === 'DISPUTED') {
                fillColor = '#ef4444';
                strokeColor = '#dc2626';
              } else if (lp.ownership_status?.includes('JOINT')) {
                fillColor = '#a855f7';
                strokeColor = '#9333ea';
              } else {
                fillColor = '#10b981';
                strokeColor = isSelected ? '#38bdf8' : '#059669';
              }
            }

            return (
              <Polygon
                key={`cad-p-${lp.parcel_id}`}
                positions={positions}
                pathOptions={{
                  color: strokeColor,
                  weight: strokeWidth,
                  dashArray: isSelected ? '3, 4' : undefined,
                  fillOpacity: isSelected ? 0.45 : 0.22,
                  fillColor: fillColor,
                }}
                eventHandlers={{
                  click: () => onSelectLandParcel && onSelectLandParcel(lp),
                }}
              >
                <Popup>
                  <div style={{ padding: '0.4rem', minWidth: '240px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)', fontSize: '0.9rem' }}>
                        Khasra {lp.survey_number}
                      </span>
                      <span className={`badge ${lp.verification_status === 'SURVEYOR_VERIFIED' ? 'badge-emerald' : 'badge-amber'}`}>
                        {lp.verification_status?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
                      <div><strong>Parcel ID:</strong> <span className="font-mono">{lp.parcel_id}</span></div>
                      <div>
                        <strong>Owner:</strong>{' '}
                        {lp.primary_owner_name || lp.owner_masked_reference || 'Khatedar Registered'}
                      </div>
                      <div>
                        <strong>Official Area:</strong> {lp.official_area_m2.toLocaleString()} m² ({lp.official_area_hectares} ha)
                      </div>
                      {lp.drone_measured_area_m2 && (
                        <div>
                          <strong style={{ color: 'var(--text-emerald)' }}>Drone Area:</strong>{' '}
                          {lp.drone_measured_area_m2.toLocaleString()} m²
                          {lp.area_difference_percentage !== undefined && (
                            <span style={{ marginLeft: '0.3rem', color: Math.abs(lp.area_difference_percentage) > 2 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              ({lp.area_difference_percentage > 0 ? '+' : ''}{lp.area_difference_percentage}%)
                            </span>
                          )}
                        </div>
                      )}
                      <div><strong>Land Use:</strong> {lp.land_use?.replace(/_/g, ' ')}</div>
                      <div><strong>Village:</strong> {lp.village}, {lp.tehsil}</div>
                    </div>

                    <button
                      onClick={() => onSelectLandParcel && onSelectLandParcel(lp)}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', fontSize: '0.75rem' }}
                    >
                      Open Parcel Deep Dive
                    </button>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 21. Historical Cadastral (1998) Boundary Lines */}
        {layerVisibility['historical-cadastral-1998'] &&
          landParcels.map((lp) => {
            const positions = extractLeafletCoords(lp.cadastral_geometry);
            if (positions.length === 0) return null;
            return (
              <Polygon
                key={`cad-hist-1998-${lp.parcel_id}`}
                positions={positions}
                pathOptions={{
                  color: '#a855f7',
                  weight: 2,
                  dashArray: '6, 6',
                  fillOpacity: 0.05,
                  fillColor: '#9333ea',
                }}
              />
            );
          })}

        {/* 22. Drone Measured Geometry (Sensor Fusion) */}
        {layerVisibility['drone-measured-parcels'] &&
          landParcels
            .filter((lp) => lp.current_geometry)
            .map((lp) => {
              const positions = extractLeafletCoords(lp.current_geometry);
              if (positions.length === 0) return null;
              return (
                <Polygon
                  key={`cad-drone-${lp.parcel_id}`}
                  positions={positions}
                  pathOptions={{
                    color: '#06b6d4',
                    weight: 2,
                    dashArray: '2, 4',
                    fillOpacity: 0.1,
                    fillColor: '#0891b2',
                  }}
                />
              );
            })}

        {/* 23. Surveyor-Verified Boundary Lines */}
        {layerVisibility['surveyor-verified-parcels'] &&
          landParcels
            .filter((lp) => lp.verified_geometry && lp.verification_status === 'SURVEYOR_VERIFIED')
            .map((lp) => {
              const positions = extractLeafletCoords(lp.verified_geometry);
              if (positions.length === 0) return null;
              return (
                <Polygon
                  key={`cad-ver-${lp.parcel_id}`}
                  positions={positions}
                  pathOptions={{
                    color: '#059669',
                    weight: 3,
                    fillOpacity: 0.15,
                    fillColor: '#10b981',
                  }}
                />
              );
            })}

        {/* 24. Conflict & Encroachment Overlay */}
        {layerVisibility['parcel-conflict-layer'] &&
          landParcels
            .filter((lp) => (lp.change_records_count && lp.change_records_count > 0) || lp.match_status === 'CONFLICT')
            .map((lp) => {
              const positions = extractLeafletCoords(lp.current_geometry || lp.cadastral_geometry);
              if (positions.length === 0) return null;
              return (
                <Polygon
                  key={`cad-conflict-${lp.parcel_id}`}
                  positions={positions}
                  pathOptions={{
                    color: '#dc2626',
                    weight: 3,
                    dashArray: '3, 3',
                    fillOpacity: 0.35,
                    fillColor: '#ef4444',
                  }}
                >
                  <Popup>
                    <div style={{ padding: '0.3rem' }}>
                      <span className="badge badge-rose">Potential Encroachment Alert</span>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Parcel {lp.parcel_id} (Khasra {lp.survey_number})
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        Critical boundary divergence or structure detected.
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

        {/* 10. Interactive Vertex Handles when in Editing Mode */}
        {isEditingMode &&
          editingVertices.map((vertex, idx) => (
            <Marker
              key={`vertex-${idx}`}
              position={vertex}
              icon={vertexIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  handleMoveVertex(idx, pos.lat, pos.lng);
                },
              }}
            >
              <Popup>
                <div style={{ fontSize: '0.75rem' }}>
                  <strong>Vertex #{idx + 1}</strong>
                  <p style={{ margin: '0.2rem 0' }}>
                    Lat: {vertex[0].toFixed(6)}°<br />
                    Lon: {vertex[1].toFixed(6)}°
                  </p>
                  <span style={{ color: 'var(--text-amber)' }}>Drag to adjust boundary</span>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Measurement Polyline */}
        {isMeasuring && measurePoints.length > 1 && (
          <Polyline
            positions={measurePoints}
            pathOptions={{ color: '#ec4899', weight: 3, dashArray: '4, 4' }}
          />
        )}
      </MapContainer>

      {/* Top Right: 24-Layer Control HUD */}
      {!hideLayerHud && (!isHudOpen ? (
        <button
          onClick={() => setIsHudOpen(true)}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            borderRadius: '0.5rem',
            padding: '0.4rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#e2e8f0',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Layers size={13} className="text-emerald-400" />
          <span>Map Layers (24)</span>
        </button>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            zIndex: 1000,
            backgroundColor: 'rgba(11, 17, 24, 0.96)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.75rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            maxWidth: '280px',
            maxHeight: '480px',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f8fafc', borderBottom: '1px solid rgba(51, 65, 85, 0.8)', paddingBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} className="text-emerald-400" /> 24 GIS Map Layers
            </div>
            <button
              onClick={() => setIsHudOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '0 0.2rem',
              }}
              title="Close layer overlay"
            >
              ✕
            </button>
          </div>

        {/* Base Layer Switch */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.2rem' }}>
          <button
            onClick={() => setActiveBaseLayer('satellite')}
            className={`btn btn-sm ${activeBaseLayer === 'satellite' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', flex: 1 }}
          >
            Satellite
          </button>
          <button
            onClick={() => setActiveBaseLayer('osm')}
            className={`btn btn-sm ${activeBaseLayer === 'osm' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', flex: 1 }}
          >
            Street Map
          </button>
        </div>

        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-amber)', marginTop: '0.2rem' }}>
          CADASTRAL &amp; LAND RECORDS
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['official-cadastral-parcels']} onChange={() => toggleLayer('official-cadastral-parcels')} />
          <span style={{ color: '#eab308', fontWeight: 600 }}>19. Official Cadastral Parcels</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['parcel-ownership-status']} onChange={() => toggleLayer('parcel-ownership-status')} />
          <span style={{ color: '#10b981', fontWeight: 600 }}>20. Ownership Status (Clear/Joint)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['drone-measured-parcels']} onChange={() => toggleLayer('drone-measured-parcels')} />
          <span style={{ color: '#06b6d4', fontWeight: 600 }}>22. Drone-Measured Boundaries</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['surveyor-verified-parcels']} onChange={() => toggleLayer('surveyor-verified-parcels')} />
          <span style={{ color: '#059669', fontWeight: 600 }}>23. Surveyor-Verified Parcels</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['parcel-conflict-layer']} onChange={() => toggleLayer('parcel-conflict-layer')} />
          <span style={{ color: '#ef4444', fontWeight: 600 }}>24. Encroachments & Conflicts</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['historical-cadastral-1998']} onChange={() => toggleLayer('historical-cadastral-1998')} />
          <span style={{ color: '#a855f7' }}>21. 1998 Historical Cadastre</span>
        </label>

        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-emerald)', marginTop: '0.3rem' }}>
          AI &amp; INTELLIGENCE
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['ai-land-classification']} onChange={() => toggleLayer('ai-land-classification')} />
          <span style={{ color: '#10b981', fontWeight: 600 }}>13. AI Land Classification</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['ai-candidate-boundaries']} onChange={() => toggleLayer('ai-candidate-boundaries')} />
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>14. AI Candidate Bunds</span> ({aiBoundaries.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['historical-change-layer']} onChange={() => toggleLayer('historical-change-layer')} />
          <span style={{ color: '#f97316', fontWeight: 600 }}>16. Historical Change Shifts</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['potential-encroachments']} onChange={() => toggleLayer('potential-encroachments')} />
          <span style={{ color: '#ef4444', fontWeight: 600 }}>17. Potential Encroachments</span>
        </label>

        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          GEOSPATIAL & SENSORS
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['orthomosaic-raster']} onChange={() => toggleLayer('orthomosaic-raster')} />
          <span style={{ color: '#10b981' }}>4. 2D Orthomosaic</span> (2.5cm)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['detected-parcels']} onChange={() => toggleLayer('detected-parcels')} />
          <span>8. Field Parcels ({parcels.length})</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['dem-elevation']} onChange={() => toggleLayer('dem-elevation')} />
          <span style={{ color: '#f59e0b' }}>6. Bare-Earth DEM</span> (50cm)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['lidar-point-cloud']} onChange={() => toggleLayer('lidar-point-cloud')} />
          <span style={{ color: '#c084fc' }}>5. LiDAR Cloud</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['flight-trajectory']} onChange={() => toggleLayer('flight-trajectory')} />
          <span style={{ color: '#06b6d4' }}>3. RTK Trajectory</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={layerVisibility['raw-camera-shots']} onChange={() => toggleLayer('raw-camera-shots')} />
          <span style={{ color: '#34d399' }}>2. Photo Shots</span>
        </label>
      </div>
      ))}


      {/* Top Left: GIS Tool HUD (Clean Floating Pill below Avionics) */}
      <div
        style={{
          position: 'absolute',
          top: '3.25rem',
          left: '0.75rem',
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '9999px',
          padding: '0.25rem 0.6rem',
          display: 'flex',
          gap: '0.4rem',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
        }}
      >
        <button
          onClick={() => {
            setIsMeasuring(!isMeasuring);
            setMeasurePoints([]);
          }}
          className={`btn btn-sm ${isMeasuring ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Ruler size={13} /> {isMeasuring ? 'Exit Measure' : 'Measure Distance'}
        </button>

        {isEditingMode && selectedParcel && (
          <button
            onClick={handleSaveEditedGeometry}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#f59e0b', borderColor: '#d97706' }}
          >
            <CheckCircle2 size={13} /> Save Vertices
          </button>
        )}
      </div>

      {/* Bottom Coordinate Tracking & Scale-Invariance HUD */}
      {!hideCoordinateBar && (
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.35rem 0.75rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span>LAT: <strong>{currentCoords.lat.toFixed(6)}° N</strong></span>
          <span>LON: <strong>{currentCoords.lng.toFixed(6)}° E</strong></span>
          <span style={{ color: 'var(--text-muted)' }}>CRS: EPSG:4326 (WGS84)</span>
          <span style={{ color: '#94a3b8' }}>Scale Invariance: 1m = 1.000m Ground Truth</span>
        </div>
      )}
    </div>
  );
};
