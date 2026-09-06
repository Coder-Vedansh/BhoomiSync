import React from 'react';
import { LineageGraph as LineageGraphType } from '../../types';
import { Camera, Eye, Cpu, Database, ArrowRight, ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface LineageGraphProps {
  lineage: LineageGraphType;
}

export const LineageGraph: React.FC<LineageGraphProps> = ({ lineage }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <Camera size={16} />;
      case 'LIDAR':
        return <Eye size={16} />;
      case 'RTK':
        return <Database size={16} />;
      case 'ORTHOMOSAIC':
      case 'DEM':
        return <FileSpreadsheet size={16} />;
      case 'AI_RESULT':
      case 'PARCEL':
        return <Cpu size={16} />;
      default:
        return <Database size={16} />;
    }
  };

  const getNodeColorClass = (type: string) => {
    switch (type) {
      case 'IMAGE':
      case 'LIDAR':
      case 'RTK':
      case 'TELEMETRY':
        return 'badge-cyan';
      case 'ORTHOMOSAIC':
      case 'DEM':
        return 'badge-amber';
      case 'AI_RESULT':
      case 'PARCEL':
      case 'COMPARISON_RESULT':
        return 'badge-emerald';
      default:
        return 'badge-emerald';
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <ShieldCheck size={18} style={{ color: 'var(--text-emerald)' }} />
          Immutable Data Lineage & Provenance Graph (DAG)
        </h3>
        <span className="badge badge-emerald">Raw Data Preserved</span>
      </div>

      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Trace how sensor acquisitions transform into photogrammetric orthomosaics, elevation models, and AI parcel boundaries. Raw files remain immutable.
      </p>

      {/* Visual DAG Nodes Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Tier 1: Raw Sensor Datasets */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#385963', marginBottom: '0.5rem' }}>
            Tier 1: Raw Sensor Ingestion (Immutable)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {lineage.nodes
              .filter((n) => ['IMAGE', 'LIDAR', 'RTK', 'METADATA', 'TELEMETRY'].includes(n.dataset_type))
              .map((node) => (
                <div
                  key={node.id}
                  style={{
                    backgroundColor: '#FAF9F5',
                    border: '1px solid #D8D5CC',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    minWidth: '180px',
                    color: '#20251F',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className={`badge ${getNodeColorClass(node.dataset_type)}`}>
                      {getNodeIcon(node.dataset_type)} {node.dataset_type}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#20251F' }}>
                    {node.dataset_id}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#5F665D' }}>
                    Source: {node.source}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Transformation Pipeline Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#5F665D', fontSize: '0.8rem', paddingLeft: '1rem' }}>
          <ArrowRight size={18} />
          <span>Processing Pipelines: SfM Photogrammetry Stitching & LiDAR Ground Cloth Filter</span>
        </div>

        {/* Tier 2: Processed GIS Layers */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#74591D', marginBottom: '0.5rem' }}>
            Tier 2: Georeferenced Terrain & Orthomosaic Rasters
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {lineage.nodes
              .filter((n) => ['ORTHOMOSAIC', 'DEM', 'DSM'].includes(n.dataset_type))
              .map((node) => (
                <div
                  key={node.id}
                  style={{
                    backgroundColor: '#FAF9F5',
                    border: '1px solid #D8D5CC',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    minWidth: '180px',
                    color: '#20251F',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className={`badge ${getNodeColorClass(node.dataset_type)}`}>
                      {getNodeIcon(node.dataset_type)} {node.dataset_type}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#20251F' }}>
                    {node.dataset_id}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#5F665D' }}>
                    Output: EPSG:4326 GeoTIFF
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* AI Inference Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#5F665D', fontSize: '0.8rem', paddingLeft: '1rem' }}>
          <ArrowRight size={18} />
          <span>AI Inference: Semantic Segmentation & Cadastral Bund Extraction</span>
        </div>

        {/* Tier 3: AI Parcels & Vector Cadastre */}
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#2E6645', marginBottom: '0.5rem' }}>
            Tier 3: Cadastral Boundary Vectors & Verified Parcels
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {lineage.nodes
              .filter((n) => ['AI_RESULT', 'PARCEL', 'COMPARISON_RESULT'].includes(n.dataset_type))
              .map((node) => (
                <div
                  key={node.id}
                  style={{
                    backgroundColor: '#FAF9F5',
                    border: '1px solid #BBD4C1',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    minWidth: '180px',
                    color: '#20251F',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className={`badge ${getNodeColorClass(node.dataset_type)}`}>
                      {getNodeIcon(node.dataset_type)} {node.dataset_type}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2E513E' }}>
                    {node.dataset_id}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#2E6645' }}>
                    Calculated Physical Geometries
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
