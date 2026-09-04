import React, { useState, useEffect } from 'react';
import { reportApi } from '../../services/reportApi';
import { ReportCreatePayload, ReportType } from '../../types/report';

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reportId: string) => void;
}

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [surveyId, setSurveyId] = useState<number>(1);
  const [parcelId, setParcelId] = useState<string>('BS-P-001');
  const [reportType, setReportType] = useState<ReportType>('CADASTRAL_SURVEY');
  const [title, setTitle] = useState<string>('Haripura Village - Cadastral Survey Report');
  const [preferredUnit, setPreferredUnit] = useState<string>('m2');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sectionsList = [
    { key: 'EXECUTIVE_SUMMARY', label: '1. Executive Summary & Comparison Matrix', default: true },
    { key: 'PARCEL_INFORMATION', label: '2. Parcel Cadastral & Location Details', default: true },
    { key: 'OWNERSHIP', label: '3. Ownership Title (RBAC Privacy Filtered)', default: true },
    { key: 'BOUNDARY_ANALYSIS', label: '4. 2D Cadastral Map & Boundary Overlays', default: true },
    { key: 'AREA_ANALYSIS', label: '5. Geodesic & 3D Terrain Surface Area', default: true },
    { key: 'DRONE_DATA', label: '6. Drone Survey & Sensor Quality Telemetry', default: true },
    { key: 'LAND_CLASSIFICATION', label: '7. AI Land-Use & Land-Cover (LULC)', default: true },
    { key: 'HISTORICAL_COMPARISON', label: '8. Historical Cadastre Baseline Alignment', default: true },
    { key: 'ENCROACHMENT', label: '9. Potential Encroachment Risk Assessment', default: true },
    { key: 'SURVEYOR_VERIFICATION', label: '10. Surveyor Verification & Digital Sign-off', default: true },
  ];

  const [selectedSections, setSelectedSections] = useState<string[]>(
    sectionsList.map((s) => s.key)
  );

  useEffect(() => {
    if (parcelId) {
      const khasra = parcelId.replace('BS-P-', '10');
      setTitle(`Haripura Village - Khasra #${khasra} Cadastral Survey Report`);
    }
  }, [parcelId]);

  if (!isOpen) return null;

  const handleToggleSection = (key: string) => {
    if (selectedSections.includes(key)) {
      setSelectedSections(selectedSections.filter((k) => k !== key));
    } else {
      setSelectedSections([...selectedSections, key]);
    }
  };

  const handleGenerate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: ReportCreatePayload = {
        survey_id: surveyId,
        parcel_id: parcelId,
        report_type: reportType,
        title,
        preferred_unit: preferredUnit,
        included_sections: selectedSections,
      };

      const draft = await reportApi.createReport(payload);
      const generated = await reportApi.generateReport(draft.report_id);
      onSuccess(generated.report_id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to generate report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div className="modal-card" style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
        width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        color: '#f8fafc', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📄</span> Generate Digital Survey Report
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Produce immutable multi-format dossier (PDF, GeoJSON, KML, CSV, JSON)
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              onClick={() => !isSubmitting && setStep(s)}
              style={{
                flex: 1, padding: '8px', textAlign: 'center', borderRadius: '6px', cursor: 'pointer',
                background: step === s ? '#065f46' : (step > s ? '#1e3a8a' : '#0f172a'),
                color: step === s ? '#34d399' : '#94a3b8',
                border: step === s ? '1px solid #10b981' : '1px solid #334155',
                fontSize: '0.85rem', fontWeight: 500,
              }}
            >
              Step {s}: {s === 1 ? 'Target Parcel' : (s === 2 ? 'Report Config' : 'Sections & Review')}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#7f1d1d', border: '1px solid #f87171', color: '#fecaca', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Target Parcel Selection */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Survey Campaign
              </label>
              <select
                value={surveyId}
                onChange={(e) => setSurveyId(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              >
                <option value={1}>SUR-2026-001: Haripura Village Resurvey Campaign (Udaipur, Rajasthan)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Select Cadastral Parcel / Khasra
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'BS-P-001', khasra: '101', name: 'Mohan Lal Sharma', area: '12,481 m²', status: 'Verified' },
                  { id: 'BS-P-002', khasra: '102', name: 'Ramesh Patel', area: '8,920 m²', status: 'Review' },
                  { id: 'BS-P-003', khasra: '103', name: 'Devi Lal Gurjar', area: '15,640 m²', status: 'Draft' },
                  { id: 'BS-P-004', khasra: '104', name: 'Gram Panchayat Land', area: '32,100 m²', status: 'Verified' },
                  { id: 'BS-P-005', khasra: '105', name: 'Kishan Meena', area: '11,200 m²', status: 'Verified' },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setParcelId(p.id)}
                    style={{
                      padding: '12px', borderRadius: '8px', cursor: 'pointer',
                      background: parcelId === p.id ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                      border: parcelId === p.id ? '2px solid #10b981' : '1px solid #334155',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: parcelId === p.id ? '#34d399' : '#fff' }}>
                      Khasra #{p.khasra}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0' }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{p.area}</span>
                      <span style={{ color: p.status === 'Verified' ? '#10b981' : '#f59e0b' }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ padding: '8px 20px', background: '#10b981', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Next: Report Config →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configuration & Units */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Report Classification Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="CADASTRAL_SURVEY">Cadastral Survey Dossier</option>
                  <option value="BOUNDARY_VERIFICATION">Boundary Verification Report</option>
                  <option value="DISPUTE_INVESTIGATION">Dispute Investigation Audit</option>
                  <option value="PUBLIC_INFORMATION">Public Information Summary (PII Masked)</option>
                  <option value="CHANGE_DETECTION">Temporal Change Detection Report</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Preferred Measurement Display Unit
                </label>
                <select
                  value={preferredUnit}
                  onChange={(e) => setPreferredUnit(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="m2">Square Metres (m²)</option>
                  <option value="hectares">Hectares (ha)</option>
                  <option value="acres">Acres (ac)</option>
                </select>
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                ℹ️ Immutability & Cryptographic Guarantee
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Generating this report creates a deterministic snapshot of all sensor geometries, flight logs, and AI inferences.
                A SHA-256 hash anchor will be stamped across all generated formats (PDF, GeoJSON, KML, CSV, JSON).
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{ padding: '8px 20px', background: '#10b981', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Next: Select Sections →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Sections & Final Generation */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Included Report Sections</label>
                <button
                  type="button"
                  onClick={() => setSelectedSections(sectionsList.map((s) => s.key))}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Select All
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {sectionsList.map((s) => (
                  <label
                    key={s.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      background: selectedSections.includes(s.key) ? '#0f172a' : '#1e293b',
                      border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(s.key)}
                      onChange={() => handleToggleSection(s.key)}
                      style={{ accentColor: '#10b981' }}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Formats notice */}
            <div style={{ background: '#064e3b', border: '1px solid #059669', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>📦</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                  Auto-Generation of 5 Production Export Formats
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
                  Includes 11-page ReportLab PDF, Multi-layer GeoJSON, OpenGIS KML, Tabular CSV, and Machine JSON.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isSubmitting}
                style={{
                  padding: '10px 24px', background: isSubmitting ? '#059669' : '#10b981',
                  border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Generating Snapshot &amp; Exports...
                  </>
                ) : (
                  '🚀 Generate Digital Survey Dossier'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
