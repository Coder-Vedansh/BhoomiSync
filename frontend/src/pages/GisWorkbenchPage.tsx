import React, { useEffect, useState } from 'react';
import { Compass, Ruler } from 'lucide-react';
import { api } from '../services/api';
import { Survey, Parcel, GISStatus } from '../types';
import { GisMap } from '../components/gis/GisMap';
import { ParcelCard } from '../components/gis/ParcelCard';

export const GisWorkbenchPage: React.FC = () => {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [gisStatus, setGisStatus] = useState<GISStatus | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [surveyData, parcelsData, statusData] = await Promise.all([
          api.getSurvey('SUR-2026-001'),
          api.getSurveyParcels('SUR-2026-001'),
          api.getGisStatus(),
        ]);
        setSurvey(surveyData);
        setParcels(parcelsData);
        setGisStatus(statusData);
        if (parcelsData.length > 0) {
          setSelectedParcel(parcelsData[0]);
        }
      } catch (err) {
        console.error('Failed to load GIS workbench', err);
      }
    }
    load();
  }, []);

  const totalAreaM2 = parcels.reduce((acc, p) => acc + p.area_m2, 0);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2>GIS Spatial Workbench & Cadastral Engine</h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Real-world geospatial coordinates (WGS84 EPSG:4326 / UTM 43N). Physical dimensions remain invariant of map zoom.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-emerald">
            <Compass size={12} /> {gisStatus?.spatial_engine.split('/')[0] || 'PostGIS 3.4'}
          </span>
          <span className="badge badge-cyan font-mono">
            {gisStatus?.default_crs || 'EPSG:4326'}
          </span>
        </div>
      </div>

      <div className="grid-3" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <GisMap
            survey={survey}
            parcels={parcels}
            selectedParcelId={selectedParcel?.parcel_id}
            onSelectParcel={(p: Parcel) => setSelectedParcel(p)}
            height="620px"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Active Parcel Inspector */}
          {selectedParcel ? (
            <ParcelCard
              parcel={selectedParcel}
              isSelected={true}
              onVerify={async (p: Parcel) => {
                const updated = await api.updateParcelStatus(p.parcel_id, 'VERIFIED');
                setParcels((prev) => prev.map((item) => (item.parcel_id === p.parcel_id ? updated : item)));
                setSelectedParcel(updated);
              }}
            />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              Select a parcel polygon to inspect geodesic measurements.
            </div>
          )}

          {/* Spatial Capabilities Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                <Ruler size={16} style={{ color: 'var(--text-emerald)' }} />
                Geodesic Calculation Engine
              </h3>
            </div>
            <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <strong>Ellipsoidal Area Integral:</strong> Chamberlain-Duquette Formula on WGS84
              </div>
              <div>
                <strong>Active Survey Total Area:</strong> {(totalAreaM2 / 10000).toFixed(4)} ha ({totalAreaM2.toLocaleString()} m²)
              </div>
              <div>
                <strong>Perimeter Calculations:</strong> Haversine Great-Circle Chord Summation
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', color: 'var(--text-muted)' }}>
                Guaranteed zoom-invariance: Physical parcel dimensions are computed from absolute georeferenced coordinates.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
