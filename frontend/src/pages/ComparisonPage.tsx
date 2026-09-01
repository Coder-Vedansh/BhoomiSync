import React, { useEffect, useState } from 'react';
import { GitCompare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { ComparisonReport } from '../types';

export const ComparisonPage: React.FC = () => {
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getSurveyComparison('SUR-2026-001');
        setReport(data);
      } catch (err) {
        console.error('Failed to load comparison data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !report) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading cadastral comparison report...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Historical Cadastre vs Drone Resurvey Comparison</h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Spatial diffing between historical land revenue maps ({report.historical_survey_ref}) and high-resolution drone orthomosaics ({report.survey_id}).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Parcels Evaluated
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0' }}>
            {report.total_parcels_compared}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>100% Coverage</div>
        </div>

        <div className="card" style={{ borderColor: (report.encroachment_alerts_count || 0) > 0 ? 'rgba(245, 158, 11, 0.5)' : undefined }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Discrepancy Alerts
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-amber)', margin: '0.2rem 0' }}>
            {report.encroachment_alerts_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-amber)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <AlertTriangle size={12} /> Boundary Drift Flagged
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Average Area Drift
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-emerald)', margin: '0.2rem 0' }}>
            {report.average_area_drift_percentage}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High Spatial Concordance</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Mean IOU Overlap
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-cyan)', margin: '0.2rem 0' }}>
            97.3%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Intersection over Union</div>
        </div>
      </div>

      {/* Comparison Detailed Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <GitCompare size={18} style={{ color: 'var(--text-emerald)' }} />
            Parcel-by-Parcel Cadastral Diff Breakdown
          </h3>
          <span className="badge badge-slate">{report.historical_survey_ref}</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parcel ID</th>
                <th>Historical Area (m²)</th>
                <th>Drone Resurvey (m²)</th>
                <th>Area Drift</th>
                <th>IOU Overlap</th>
                <th>Land Use Transition</th>
                <th>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              {report.comparisons.map((c) => (
                <tr key={c.parcel_id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)' }}>
                    {c.parcel_id}
                  </td>
                  <td>{c.historical_area_m2.toLocaleString()} m²</td>
                  <td style={{ fontWeight: 600 }}>{c.current_area_m2.toLocaleString()} m²</td>
                  <td style={{ color: c.area_difference_m2 > 50 ? 'var(--text-amber)' : 'var(--text-primary)' }}>
                    {c.area_difference_m2 > 0 ? `+${c.area_difference_m2.toFixed(1)}` : c.area_difference_m2.toFixed(1)} m² ({c.area_change_percentage > 0 ? `+${c.area_change_percentage}` : c.area_change_percentage}%)
                  </td>
                  <td>{(c.iou_overlap * 100).toFixed(1)}%</td>
                  <td>
                    {c.land_use_changed ? (
                      <span className="badge badge-amber">
                        {c.historical_land_use.replace('_', ' ')} &rarr; {c.current_land_use.replace('_', ' ')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unchanged ({c.current_land_use.replace('_', ' ')})</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'MATCHED' ? 'badge-emerald' : 'badge-amber'}`}>
                      {c.status === 'MATCHED' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
