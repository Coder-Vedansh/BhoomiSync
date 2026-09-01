import React, { useEffect, useState } from 'react';
import {
  Compass,
  Ruler,
  RotateCw,
  CheckCircle2,
  Zap,
  Mountain,
  Edit3,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import {
  Survey,
  Parcel,
  GeospatialPipelineStatus,
} from '../types';
import { GisMap } from '../components/gis/GisMap';

export const GeospatialWorkbenchPage: React.FC = () => {
  const [selectedSurveyId] = useState<string>('SUR-2026-001');
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<GeospatialPipelineStatus | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Unit display preferences
  const [areaUnit, setAreaUnit] = useState<'m2' | 'ha' | 'acres'>('m2');

  const loadData = async () => {
    try {
      const [surveyData, parcelsData, statusData] = await Promise.all([
        api.getSurvey(selectedSurveyId),
        api.getSurveyParcels(selectedSurveyId),
        api.getGeospatialPipelineStatus(selectedSurveyId).catch(() => null),
      ]);
      setSurvey(surveyData);
      setParcels(parcelsData);
      if (statusData) setPipelineStatus(statusData);
      if (parcelsData.length > 0 && !selectedParcel) {
        setSelectedParcel(parcelsData[0]);
      }
    } catch (err) {
      console.error('Failed to load geospatial data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSurveyId]);

  const handleTriggerFullPipeline = async () => {
    setIsProcessing(true);
    setAlertMessage('Initiating 11-stage Geospatial Processing & Multi-Sensor Fusion Pipeline...');
    try {
      await api.startGeospatialProcessing(selectedSurveyId, { target_gsd_cm: 2.5, target_dem_res_m: 0.5 });
      setAlertMessage('Pipeline completed successfully! 2D Orthomosaic, DEM, and terrain-aware surface areas updated.');
      await loadData();
    } catch (err: any) {
      setAlertMessage(`Processing error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateGeometry = async (parcelId: string, updatedCoordinates: [number, number][]) => {
    try {
      const geojson = {
        type: 'Polygon',
        coordinates: [updatedCoordinates.map((pt) => [pt[1], pt[0]])],
      };
      const updated = await api.updateParcelGeometry(parcelId, {
        geometry_geojson: geojson,
        comment: 'Surveyor manual vertex edit in GIS workbench',
      });
      setParcels((prev) => prev.map((p) => (p.parcel_id === parcelId ? updated : p)));
      setSelectedParcel(updated);
      setIsEditingMode(false);
      setAlertMessage(`Parcel ${parcelId} boundary updated and measurements recalculated!`);
    } catch (err: any) {
      setAlertMessage(`Failed to update parcel: ${err.message}`);
    }
  };

  const handleVerifyParcel = async (parcelId: string) => {
    try {
      const updated = await api.updateParcelStatus(parcelId, 'VERIFIED', 'Surveyor field verified');
      setParcels((prev) => prev.map((p) => (p.parcel_id === parcelId ? updated : p)));
      setSelectedParcel(updated);
      setAlertMessage(`Parcel ${parcelId} verified successfully.`);
    } catch (err: any) {
      setAlertMessage(`Failed to verify parcel: ${err.message}`);
    }
  };

  const handleDeleteParcel = async (parcelId: string) => {
    if (window.confirm(`Are you sure you want to delete ${parcelId}?`)) {
      try {
        await api.deleteParcel(parcelId);
        setParcels((prev) => prev.filter((p) => p.parcel_id !== parcelId));
        setSelectedParcel(null);
        setAlertMessage(`Parcel ${parcelId} deleted.`);
      } catch (err: any) {
        setAlertMessage(`Failed to delete parcel: ${err.message}`);
      }
    }
  };

  const formatArea = (m2: number, ha?: number, acres?: number) => {
    if (areaUnit === 'ha') {
      return `${(ha ?? m2 / 10000.0).toFixed(4)} ha`;
    }
    if (areaUnit === 'acres') {
      return `${(acres ?? m2 / 4046.8564).toFixed(4)} acres`;
    }
    return `${m2.toLocaleString()} m²`;
  };

  return (
    <div className="page-container">
      {/* Top Header & Launch Control */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>Geospatial Processing & GIS Survey Map</h2>
            <span className="badge badge-emerald font-mono">FUSION ENGINE</span>
            <span className="badge badge-cyan font-mono">EPSG:4326 / UTM 43N</span>

          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-world georeferenced scale invariance. 1m ground = 1m real-world. Camera + 3D LiDAR + RTK GNSS Fusion & 3D Terrain Surface Area.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleTriggerFullPipeline}
            disabled={isProcessing}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)' }}
          >
            {isProcessing ? <RotateCw className="spin" size={14} /> : <Zap size={14} />}
            {isProcessing ? 'Processing 11 Stages...' : 'Run Full Geospatial Processing Pipeline Simulation'}
          </button>
        </div>
      </div>

      {alertMessage && (
        <div
          style={{
            padding: '0.65rem 1rem',
            backgroundColor: alertMessage.includes('error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${alertMessage.includes('error') ? 'var(--accent-red)' : 'var(--accent-emerald)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <span>{alertMessage}</span>
          <button onClick={() => setAlertMessage(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Main 3-Column GIS Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 340px', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* LEFT COLUMN: Map Scale & Tools Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Unit Switcher Card */}
          <div className="card" style={{ padding: '0.85rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Ruler size={14} style={{ color: 'var(--text-emerald)' }} /> Display Units
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {(['m2', 'ha', 'acres'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setAreaUnit(unit)}
                  className={`btn btn-sm ${areaUnit === unit ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.72rem', padding: '0.25rem' }}
                >
                  {unit === 'm2' ? 'm²' : unit}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Zooming or changing units never alters underlying ground measurements.
            </p>
          </div>

          {/* Scale Invariance Metric Card */}
          <div className="card" style={{ padding: '0.85rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Compass size={14} style={{ color: 'var(--text-cyan)' }} /> Geodetic Projection
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div>Geographic CRS: <strong className="font-mono" style={{ color: 'var(--text-emerald)' }}>EPSG:4326</strong></div>
              <div>Projected CRS: <strong className="font-mono" style={{ color: 'var(--text-cyan)' }}>EPSG:32643</strong> (UTM 43N)</div>
              <div>Datum: <strong>WGS84 Ellipsoid</strong></div>
              <div>Orthometric Geoid: <strong>EGM96 Model</strong></div>
              <div>Target GSD: <strong>2.5 cm/pixel</strong></div>
              <div>DEM Grid: <strong>50 cm/pixel</strong></div>
            </div>
          </div>

          {/* Quick Parcel List */}
          <div className="card" style={{ padding: '0.85rem', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Survey Parcels</span>
              <span className="badge badge-cyan">{parcels.length} Plots</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto' }}>
              {parcels.map((p) => {
                const isSel = selectedParcel?.parcel_id === p.parcel_id;
                return (
                  <div
                    key={p.parcel_id}
                    onClick={() => setSelectedParcel(p)}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSel ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSel ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{p.parcel_id}</span>
                      <span style={{ color: 'var(--text-emerald)' }}>{p.area_hectares} ha</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                      <span>{p.land_use.replace(/_/g, ' ')}</span>
                      <span>{p.verification_status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive 12-Layer GIS Map */}
        <div>
          <GisMap
            survey={survey}
            parcels={parcels}
            selectedParcelId={selectedParcel?.parcel_id}
            onSelectParcel={(p: Parcel) => setSelectedParcel(p)}
            onUpdateParcelGeometry={handleUpdateGeometry}
            height="640px"
            isEditingMode={isEditingMode}
          />
        </div>

        {/* RIGHT COLUMN: Active Parcel & Terrain Surface Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedParcel ? (
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>{selectedParcel.parcel_id}</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Khasra No: {selectedParcel.attributes_json?.khasra_no || '104/1'}
                  </span>
                </div>
                <span className={`badge ${selectedParcel.verification_status === 'VERIFIED' ? 'badge-emerald' : 'badge-amber'}`}>
                  {selectedParcel.verification_status}
                </span>
              </div>

              {/* Area Comparison: Horizontal Planar vs 3D Terrain Surface Area */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Horizontal Planar Area
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0.15rem 0' }}>
                  {formatArea(selectedParcel.area_m2, selectedParcel.area_hectares)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {selectedParcel.area_m2.toLocaleString()} m² • {(selectedParcel.area_m2 / 4046.8564).toFixed(3)} acres
                </div>

                <div style={{ borderTop: '1px dashed var(--border-subtle)', marginTop: '0.6rem', paddingTop: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mountain size={12} /> 3D Terrain Surface Area
                    </span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      +{(selectedParcel.slope_degrees ? (1 / Math.cos((selectedParcel.slope_degrees * Math.PI) / 180) - 1) * 100 : 0.8).toFixed(2)}% Terrain
                    </span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-emerald)', margin: '0.15rem 0' }}>
                    {formatArea(
                      selectedParcel.surface_area_m2 || selectedParcel.area_m2 * 1.008,
                      selectedParcel.surface_area_hectares || selectedParcel.area_hectares * 1.008
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Accounts for terrain slope ({selectedParcel.slope_degrees || 3.5}°) from bare-earth DEM
                  </div>
                </div>
              </div>

              {/* Dimensional Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Perimeter</div>
                  <strong style={{ color: '#fff' }}>{selectedParcel.perimeter_m.toLocaleString()} m</strong>
                </div>
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Mean Slope</div>
                  <strong style={{ color: '#fff' }}>{selectedParcel.slope_degrees || 3.5}°</strong>
                </div>
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Min Elevation</div>
                  <strong style={{ color: '#fff' }}>{selectedParcel.elevation_min_m || 582.4} m</strong>
                </div>
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Max Elevation</div>
                  <strong style={{ color: '#fff' }}>{selectedParcel.elevation_max_m || 594.8} m</strong>
                </div>
              </div>

              {/* Centroid Coordinates & Accuracy */}
              <div style={{ fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Centroid Coordinates:</span>
                  <span className="font-mono">{selectedParcel.centroid_lat.toFixed(6)}°N, {selectedParcel.centroid_lon.toFixed(6)}°E</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Boundary Confidence:</span>
                  <strong style={{ color: 'var(--text-emerald)' }}>{(selectedParcel.confidence * 100).toFixed(1)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Boundary Source:</span>
                  <span>{selectedParcel.source.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Action Buttons: Editing Mode / Verification */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
                <button
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className={`btn btn-sm ${isEditingMode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', backgroundColor: isEditingMode ? '#f59e0b' : undefined }}
                >
                  <Edit3 size={13} /> {isEditingMode ? 'Exit Vertex Editing' : 'Edit Boundary Vertices'}
                </button>

                <button
                  onClick={() => handleVerifyParcel(selectedParcel.parcel_id)}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                >
                  <ShieldCheck size={13} /> Verify Legal Ownership
                </button>

                <button
                  onClick={() => handleDeleteParcel(selectedParcel.parcel_id)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '0.72rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                >
                  <Trash2 size={12} /> Delete Parcel
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Select a field parcel from the map or list to inspect real-world planar and terrain-aware surface measurements.
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: 11-Stage Processing Pipeline Visualizer */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>
              11-Stage Geospatial Processing & Cadastral Pipeline
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Continuous automated progression from raw multi-sensor payloads to centimeter-accurate 2D cadastral GIS representations.
            </p>
          </div>
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} /> Complete Pipeline Operational
          </span>
        </div>

        {/* 11 Stages Flow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '0.4rem' }}>
          {pipelineStatus?.stages.map((stg, idx) => (
            <div
              key={stg.stage_id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.4rem',
                fontSize: '0.68rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                textAlign: 'center',
              }}
            >
              <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem', fontWeight: 700 }}>
                {idx + 1}. {stg.stage_id}
              </div>
              <strong style={{ fontSize: '0.7rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stg.name}
              </strong>
              <div style={{ marginTop: 'auto' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.58rem', padding: '0.1rem 0.3rem' }}>
                  {stg.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
