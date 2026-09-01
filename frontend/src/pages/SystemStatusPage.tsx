import React, { useEffect, useState } from 'react';
import { Radio, Database, Cloud, Compass, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { SystemHealth, GISStatus } from '../types';

export const SystemStatusPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [gisStatus, setGisStatus] = useState<GISStatus | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [healthData, gisData] = await Promise.all([
          api.getHealth(),
          api.getGisStatus(),
        ]);
        setHealth(healthData);
        setGisStatus(gisData);
      } catch (e) {
        console.error('Failed to load system status', e);
      }
    }
    load();
  }, []);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>System Architecture & Hardware Interfaces</h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Health of the sensor acquisition pipeline, decoupled gateways, spatial database, and storage providers.
        </p>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Gateway Architecture Monitor */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Radio size={18} style={{ color: 'var(--text-emerald)' }} />
              Sensor Gateway Abstraction (DataGateway)
            </h3>
            <span className="badge badge-emerald">ACTIVE PROTOTYPE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-emerald)', marginBottom: '0.2rem' }}>
                Current Implementation: ESP32PhoneGateway
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Sensors &rarr; ESP32 MCU &rarr; Bluetooth/Wi-Fi &rarr; Mobile Phone App &rarr; HTTPS Relay &rarr; BhoomiSync
              </p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Device ID: <strong>ESP32-HARIPURA-PROTO-01</strong> | Relay Version: <strong>v1.0.4-field-beta</strong>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Future Implementation: CompanionComputerGateway
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Sensors &rarr; Onboard Companion Computer (Jetson/ARM) &rarr; Direct 4G/5G/Wi-Fi &rarr; BhoomiSync
              </p>
              <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Interface stub registered. Activated when custom drone hardware is manufactured.
              </div>
            </div>
          </div>
        </div>

        {/* Cloud Storage Abstraction Monitor */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Cloud size={18} style={{ color: 'var(--text-cyan)' }} />
              Object Storage Abstraction (CloudStorageProvider)
            </h3>
            <span className="badge badge-cyan">{health?.storage_provider || 'MOCK'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-cyan)', marginBottom: '0.2rem' }}>
                Active Provider: MockStorageProvider
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                Local filesystem backing with SHA-256 cryptographic verification for air-gapped field operations.
              </p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Bucket: <strong>bhoomisync-surveys-data</strong> | Path: <strong>./data/</strong>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Production Pluggable Adapters: S3 / Azure Blob / Google Cloud
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Zero code modification required. Simply change <code>STORAGE_PROVIDER=S3</code> in environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spatial Database & CRS Reference */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Database size={18} style={{ color: 'var(--text-amber)' }} />
              PostgreSQL / PostGIS Engine
            </h3>
            <span className="badge badge-emerald">OPERATIONAL</span>
          </div>

          <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <strong>Database:</strong> {health?.database}
            </div>
            <div>
              <strong>Spatial Extension:</strong> PostGIS 3.4 Spatial Indexing & GEOS
            </div>
            <div>
              <strong>Data Preserved:</strong> Immutable raw sensor logs (CAM, LIDAR, RTK, TELEMETRY)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Compass size={18} style={{ color: 'var(--text-emerald)' }} />
              Coordinate Reference Systems (CRS)
            </h3>
            <span className="badge badge-slate">EPSG Registry</span>
          </div>

          <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(gisStatus?.supported_crs || gisStatus?.supported_projections || []).map((crs: string) => (
              <div key={crs} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={12} style={{ color: 'var(--text-emerald)' }} />
                <span>{crs}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
