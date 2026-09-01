import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Calendar,
  Layers,
  Map,
  GitBranch,
  ArrowLeft,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { api } from '../services/api';
import { Survey, Dataset, Parcel, LineageGraph as LineageGraphType } from '../types';
import { GisMap } from '../components/gis/GisMap';
import { ParcelCard } from '../components/gis/ParcelCard';
import { LineageGraph } from '../components/lineage/LineageGraph';

interface SurveyDetailPageProps {
  surveyId: string;
  onBack: () => void;
}

export const SurveyDetailPage: React.FC<SurveyDetailPageProps> = ({ surveyId, onBack }) => {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [lineage, setLineage] = useState<LineageGraphType | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'datasets' | 'parcels' | 'lineage' | 'geojson'>('map');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        const [surveyData, datasetsData, parcelsData, lineageData] = await Promise.all([
          api.getSurvey(surveyId),
          api.getSurveyDatasets(surveyId),
          api.getSurveyParcels(surveyId),
          api.getSurveyLineage(surveyId),
        ]);
        setSurvey(surveyData);
        setDatasets(datasetsData);
        setParcels(parcelsData);
        setLineage(lineageData);
        if (parcelsData.length > 0) {
          setSelectedParcel(parcelsData[0]);
        }
      } catch (err) {
        console.error('Failed to load survey details', err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [surveyId]);

  const handleVerifyParcel = async (parcel: Parcel) => {
    try {
      const updated = await api.updateParcelStatus(parcel.parcel_id, 'VERIFIED', 'Surveyor field sign-off');
      setParcels((prev) => prev.map((p) => (p.parcel_id === parcel.parcel_id ? updated : p)));
      setSelectedParcel(updated);
    } catch (err) {
      alert('Verification error: ' + err);
    }
  };

  if (loading || !survey) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading survey workspace {surveyId}...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button onClick={onBack} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back to Surveys
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} /> {survey.status}
          </span>
          <span className="badge badge-cyan font-mono">
            {survey.center_latitude.toFixed(4)}° N, {survey.center_longitude.toFixed(4)}° E
          </span>
        </div>
      </div>

      {/* Survey Title Card */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(180deg, #162433 0%, #111a24 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="font-mono" style={{ color: 'var(--text-emerald)', fontWeight: 700, fontSize: '0.88rem' }}>
              {survey.survey_id}
            </div>
            <h2 style={{ fontSize: '1.4rem', margin: '0.2rem 0' }}>{survey.name}</h2>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {survey.location}, {survey.district}, {survey.state}</span>
              <span><Calendar size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {new Date(survey.survey_date).toLocaleDateString()}</span>
              <span>Area: <strong>{survey.total_area_hectares} ha</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button
          onClick={() => setActiveTab('map')}
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
        >
          <Map size={16} /> Interactive GIS Map
        </button>
        <button
          onClick={() => setActiveTab('parcels')}
          className={`tab-btn ${activeTab === 'parcels' ? 'active' : ''}`}
        >
          <Layers size={16} /> Cadastral Parcels ({parcels.length})
        </button>
        <button
          onClick={() => setActiveTab('datasets')}
          className={`tab-btn ${activeTab === 'datasets' ? 'active' : ''}`}
        >
          <FileCode size={16} /> Sensor Datasets ({datasets.length})
        </button>
        <button
          onClick={() => setActiveTab('lineage')}
          className={`tab-btn ${activeTab === 'lineage' ? 'active' : ''}`}
        >
          <GitBranch size={16} /> Provenance DAG
        </button>
        <button
          onClick={() => setActiveTab('geojson')}
          className={`tab-btn ${activeTab === 'geojson' ? 'active' : ''}`}
        >
          <FileCode size={16} /> Raw GeoJSON Inspector
        </button>
      </div>

      {/* Tab 1: GIS Map */}
      {activeTab === 'map' && (
        <div className="grid-3" style={{ gap: '1.5rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <GisMap
              survey={survey}
              parcels={parcels}
              selectedParcelId={selectedParcel?.parcel_id}
              onSelectParcel={(p: Parcel) => setSelectedParcel(p)}
              height="600px"
            />
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Selected Parcel Inspector</h3>
            {selectedParcel ? (
              <ParcelCard
                parcel={selectedParcel}
                isSelected={true}
                onVerify={handleVerifyParcel}
              />
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Click a parcel polygon on the map to inspect its real-world physical area & land use attributes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Parcels List */}
      {activeTab === 'parcels' && (
        <div>
          <div className="grid-3">
            {parcels.map((p: Parcel) => (
              <ParcelCard
                key={p.parcel_id}
                parcel={p}
                isSelected={selectedParcel?.parcel_id === p.parcel_id}
                onSelect={(selected: Parcel) => setSelectedParcel(selected)}
                onVerify={handleVerifyParcel}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Datasets */}
      {activeTab === 'datasets' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dataset ID</th>
                <th>Type</th>
                <th>Source</th>
                <th>Status</th>
                <th>Immutability</th>
                <th>Metadata Highlights</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)' }}>
                    {d.dataset_id}
                  </td>
                  <td>
                    <span className="badge badge-cyan">{d.dataset_type}</span>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{d.source}</td>
                  <td>
                    <span className="badge badge-emerald">{d.status}</span>
                  </td>
                  <td>
                    {d.is_immutable ? (
                      <span className="badge badge-purple">Preserved</span>
                    ) : (
                      <span className="badge badge-slate">Mutable</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {Object.entries(d.metadata_json || {})
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Lineage DAG */}
      {activeTab === 'lineage' && lineage && (
        <LineageGraph lineage={lineage} />
      )}

      {/* Tab 5: GeoJSON Inspector */}
      {activeTab === 'geojson' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Survey & Parcel Geometry GeoJSON (EPSG:4326)</h3>
            <span className="badge badge-slate">WGS84 Coordinates</span>
          </div>
          <pre
            className="font-mono"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              overflowX: 'auto',
              maxHeight: '480px',
              fontSize: '0.78rem',
              color: 'var(--text-emerald)',
            }}
          >
            {JSON.stringify(
              {
                type: 'FeatureCollection',
                survey_id: survey.survey_id,
                features: parcels.map((p) => ({
                  type: 'Feature',
                  id: p.parcel_id,
                  geometry: p.geometry_geojson,
                  properties: {
                    parcel_id: p.parcel_id,
                    area_m2: p.area_m2,
                    area_hectares: p.area_hectares,
                    perimeter_m: p.perimeter_m,
                    land_use: p.land_use,
                    status: p.verification_status,
                    ...p.attributes_json,
                  },
                })),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
};
