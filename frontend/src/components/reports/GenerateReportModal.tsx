import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { reportApi } from '../../services/reportApi';
import { ReportCreatePayload, ReportType } from '../../types/report';
import { ProgressOperationBanner } from '../ui';

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
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          {/* Backdrop (opacity: 0 -> 1, 180ms) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />

          {/* Modal Card (opacity: 0 -> 1, scale: 0.98 -> 1, y: 4px -> 0, 200ms) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="modal-card relative z-10 w-full max-w-2xl bg-white border border-[#D8D5CC] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] text-[#20251F] p-6 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #D8D5CC', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#2E513E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📄</span> Generate Digital Survey Report
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#5F665D' }}>
              Produce immutable multi-format dossier (PDF, GeoJSON, KML, CSV, JSON)
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#5F665D', fontSize: '1.5rem', cursor: 'pointer' }}>
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
                background: step === s ? '#E6EFE8' : (step > s ? '#FAF8F3' : '#FAF9F5'),
                color: step === s ? '#2E6645' : (step > s ? '#20251F' : '#5F665D'),
                border: step === s ? '1px solid #BBD4C1' : '1px solid #D8D5CC',
                fontSize: '0.85rem', fontWeight: step === s ? 600 : 500,
              }}
            >
              Step {s}: {s === 1 ? 'Target Parcel' : (s === 2 ? 'Report Config' : 'Sections & Review')}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FAF2EE', border: '1px solid #E6C0B1', color: '#914B38', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Target Parcel Selection */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#20251F', fontWeight: 600, marginBottom: '6px' }}>
                Survey Campaign
              </label>
              <select
                value={surveyId}
                onChange={(e) => setSurveyId(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', background: '#FFFFFF', border: '1px solid #D8D5CC', borderRadius: '6px', color: '#20251F' }}
              >
                <option value={1}>SUR-2026-001: Haripura Village Resurvey Campaign (Udaipur, Rajasthan)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#20251F', fontWeight: 600, marginBottom: '6px' }}>
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
                      background: parcelId === p.id ? '#E6EFE8' : '#FAF9F5',
                      border: parcelId === p.id ? '2px solid #2E513E' : '1px solid #D8D5CC',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: parcelId === p.id ? '#2E513E' : '#20251F' }}>
                      Khasra #{p.khasra}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#5F665D', margin: '3px 0' }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#737A70' }}>
                      <span>{p.area}</span>
                      <span style={{ color: p.status === 'Verified' ? '#2E6645' : '#914B38', fontWeight: 600 }}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-forest"
                style={{ padding: '8px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#20251F', fontWeight: 600, marginBottom: '6px' }}>
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#FFFFFF', border: '1px solid #D8D5CC', borderRadius: '6px', color: '#20251F' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#20251F', fontWeight: 600, marginBottom: '6px' }}>
                  Report Classification Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  style={{ width: '100%', padding: '10px', background: '#FFFFFF', border: '1px solid #D8D5CC', borderRadius: '6px', color: '#20251F' }}
                >
                  <option value="CADASTRAL_SURVEY">Cadastral Survey Dossier</option>
                  <option value="BOUNDARY_VERIFICATION">Boundary Verification Report</option>
                  <option value="DISPUTE_INVESTIGATION">Dispute Investigation Audit</option>
                  <option value="PUBLIC_INFORMATION">Public Information Summary (PII Masked)</option>
                  <option value="CHANGE_DETECTION">Temporal Change Detection Report</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#20251F', fontWeight: 600, marginBottom: '6px' }}>
                  Preferred Measurement Display Unit
                </label>
                <select
                  value={preferredUnit}
                  onChange={(e) => setPreferredUnit(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#FFFFFF', border: '1px solid #D8D5CC', borderRadius: '6px', color: '#20251F' }}
                >
                  <option value="m2">Square Metres (m²)</option>
                  <option value="hectares">Hectares (ha)</option>
                  <option value="acres">Acres (ac)</option>
                </select>
              </div>
            </div>

            <div style={{ background: '#E8F1F3', padding: '14px', borderRadius: '8px', border: '1px solid #BDD7DE' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#385963', marginBottom: '4px' }}>
                ℹ️ Immutability & Cryptographic Guarantee
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4F6870', lineHeight: 1.5 }}>
                Generating this report creates a deterministic snapshot of all sensor geometries, flight logs, and AI inferences.
                A SHA-256 hash anchor will be stamped across all generated formats (PDF, GeoJSON, KML, CSV, JSON).
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-stone"
                style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-forest"
                style={{ padding: '8px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
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
                <label style={{ fontSize: '0.85rem', color: '#20251F', fontWeight: 600 }}>Included Report Sections</label>
                <button
                  type="button"
                  onClick={() => setSelectedSections(sectionsList.map((s) => s.key))}
                  style={{ background: 'transparent', border: 'none', color: '#2E6645', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
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
                      background: selectedSections.includes(s.key) ? '#E6EFE8' : '#FAF9F5',
                      border: selectedSections.includes(s.key) ? '1px solid #BBD4C1' : '1px solid #D8D5CC',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
                      color: '#20251F',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(s.key)}
                      onChange={() => handleToggleSection(s.key)}
                      style={{ accentColor: '#2E513E' }}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Formats notice */}
            <div style={{ background: '#E6EFE8', border: '1px solid #BBD4C1', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>📦</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2E6645' }}>
                  Auto-Generation of 5 Production Export Formats
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4F7D60' }}>
                  Includes 11-page ReportLab PDF, Multi-layer GeoJSON, OpenGIS KML, Tabular CSV, and Machine JSON.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="btn-stone"
                style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isSubmitting}
                className="btn-forest"
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? 'Generating Snapshot & Exports...' : '🚀 Generate Digital Survey Dossier'}
              </button>
            </div>

            {isSubmitting && (
              <ProgressOperationBanner
                title="Processing survey & generating dossier..."
                stageName="Cryptographic SHA-256 anchoring & multi-format export"
                stageIndex={3}
                totalStages={5}
                progressPercent={68}
                className="mt-4"
              />
            )}
          </div>
        )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
