import React from 'react';
import { Parcel } from '../../types';
import { CheckCircle2, Edit3, Sparkles } from 'lucide-react';

interface ParcelCardProps {
  parcel: Parcel;
  isSelected?: boolean;
  onSelect?: (parcel: Parcel) => void;
  onVerify?: (parcel: Parcel) => void;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({
  parcel,
  isSelected,
  onSelect,
  onVerify,
}) => {
  const getStatusBadge = () => {
    switch (parcel.verification_status) {
      case 'VERIFIED':
        return (
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} /> Verified
          </span>
        );
      case 'MANUALLY_EDITED':
        return (
          <span className="badge badge-cyan">
            <Edit3 size={12} /> Surveyor Edited (v{parcel.version})
          </span>
        );
      default:
        return (
          <span className="badge badge-amber">
            <Sparkles size={12} /> AI Detected
          </span>
        );
    }
  };

  const getLandUseBadge = () => {
    switch (parcel.land_use) {
      case 'AGRICULTURAL_CROP':
        return <span className="badge badge-emerald">Crop Field</span>;
      case 'AGRICULTURAL_FALLOW':
        return <span className="badge badge-amber">Fallow Land</span>;
      case 'ORCHARD_PLANTATION':
        return <span className="badge badge-cyan">Orchard</span>;
      case 'WATER_BODY':
        return <span className="badge badge-cyan">Water Body</span>;
      default:
        return <span className="badge badge-slate">{parcel.land_use}</span>;
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(parcel)}
      className="card"
      style={{
        cursor: 'pointer',
        borderColor: isSelected ? 'var(--accent-emerald)' : undefined,
        backgroundColor: isSelected ? 'var(--bg-card-hover)' : undefined,
        boxShadow: isSelected ? 'inset 3px 0 0 var(--accent-emerald)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-emerald)' }}>
            {parcel.parcel_id}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Source: {parcel.source}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
        {getLandUseBadge()}
        <span className="badge badge-slate">
          Confidence: {(parcel.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Physical Area</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {parcel.area_m2.toLocaleString()} m²
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-emerald)' }}>
            {parcel.area_hectares} Hectares
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Perimeter</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {parcel.perimeter_m.toLocaleString()} m
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Centroid: {parcel.centroid_lat?.toFixed(4)}, {parcel.centroid_lon?.toFixed(4)}
          </div>
        </div>
      </div>

      {parcel.attributes_json && Object.keys(parcel.attributes_json).length > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {Object.entries(parcel.attributes_json).map(([k, v]) => (
            <span key={k}>
              <strong>{k.replace('_', ' ')}:</strong> {String(v)}
            </span>
          ))}
        </div>
      )}

      {onVerify && parcel.verification_status !== 'VERIFIED' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVerify(parcel);
          }}
          className="btn btn-primary btn-sm"
          style={{ width: '100%', marginTop: '0.75rem' }}
        >
          <CheckCircle2 size={14} /> Mark Surveyor Verified
        </button>
      )}
    </div>
  );
};
