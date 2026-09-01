import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Survey,
  AIModelRecord,
  AIClassificationRegion,
  AIBoundaryCandidate,
  AIHistoricalChange,
  AISurveySummary,
} from '../types';
import { GisMap } from '../components/gis/GisMap';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

export const AIAnalysisPage: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('SUR-2026-001');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  const [aiModels, setAiModels] = useState<AIModelRecord[]>([]);
  const [summary, setSummary] = useState<AISurveySummary | null>(null);
  const [classifications, setClassifications] = useState<AIClassificationRegion[]>([]);
  const [boundaries, setBoundaries] = useState<AIBoundaryCandidate[]>([]);
  const [changes, setChanges] = useState<AIHistoricalChange[]>([]);

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.60);
  const [activeTab, setActiveTab] = useState<'boundaries' | 'classification' | 'changes' | 'models'>('boundaries');
  const [isRunningInference, setIsRunningInference] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const surveyorComment = 'Surveyor verified candidate boundary as authoritative';
  const rejectReason = 'Seasonal temporary irrigation ditch';

  useEffect(() => {
    api.getSurveys().then((res) => {
      setSurveys(res);
      if (res.length > 0) {
        const found = res.find((s) => s.survey_id === selectedSurveyId) || res[0];
        setSelectedSurvey(found);
        setSelectedSurveyId(found.survey_id);
      }
    });

    api.getAIModels().then((res) => {
      if (res && res.models) setAiModels(res.models);
    });
  }, []);

  useEffect(() => {
    if (selectedSurveyId) {
      const found = surveys.find((s) => s.survey_id === selectedSurveyId) || null;
      setSelectedSurvey(found);
      loadAIData(selectedSurveyId);
    }
  }, [selectedSurveyId]);

  const loadAIData = async (surveyId: string) => {
    try {
      const [sum, cls, bnd, chg] = await Promise.all([
        api.getAISurveySummary(surveyId).catch(() => null),
        api.getAISurveyClassifications(surveyId).catch(() => []),
        api.getAISurveyBoundaries(surveyId).catch(() => []),
        api.getAISurveyChanges(surveyId).catch(() => []),
      ]);
      if (sum) setSummary(sum);
      if (cls) setClassifications(cls);
      if (bnd) setBoundaries(bnd);
      if (chg) setChanges(chg);
    } catch (err) {
      console.error('Failed to load AI data', err);
    }
  };

  const handleRunFullAISuite = async () => {
    if (!selectedSurveyId) return;
    setIsRunningInference(true);
    setStatusMessage('Executing Multi-Modal AI Fusion Suite (RGB + LiDAR + DEM)...');
    try {
      await api.runFullAISuite(selectedSurveyId, confidenceThreshold);
      await loadAIData(selectedSurveyId);
      setStatusMessage('Full AI Suite completed successfully!');
    } catch (err: any) {
      setStatusMessage(`AI Inference failed: ${err.message}`);
    } finally {
      setIsRunningInference(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleVerifyBoundary = async (boundaryId: string) => {
    try {
      await api.verifyAIBoundary(boundaryId, surveyorComment);
      await loadAIData(selectedSurveyId);
      setStatusMessage(`Boundary ${boundaryId} successfully certified by surveyor!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  const handleRejectBoundary = async (boundaryId: string) => {
    try {
      await api.rejectAIBoundary(boundaryId, rejectReason);
      await loadAIData(selectedSurveyId);
      setStatusMessage(`Boundary ${boundaryId} rejected as false positive.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
      {/* Top Header & Survey Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">NEURAL VISION</span>
            <span className="badge badge-cyan">BaseAIModel v2.0</span>
            <span className="badge badge-purple">SIMULATED_DEMO_AI</span>
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles style={{ color: 'var(--text-emerald)' }} /> AI Land Classification & Boundary Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Multi-modal sensor fusion intelligence combining RGB Orthomosaics, LiDAR bare-earth ridges, and historical cadastral records.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <Sliders size={14} style={{ color: 'var(--text-emerald)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conf Threshold:</span>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              style={{ width: '80px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-emerald)' }}>
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="input-select"
            style={{ width: '220px', fontWeight: 600 }}
          >
            {surveys.map((s) => (
              <option key={s.survey_id} value={s.survey_id}>
                {s.survey_id} — {s.name || s.location}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunFullAISuite}
            disabled={isRunningInference}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {isRunningInference ? <RotateCw className="spin" size={15} /> : <Play size={15} />}
            {isRunningInference ? 'Running AI Suite...' : 'Run Full AI Fusion Suite'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={16} /> {statusMessage}
        </div>
      )}

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LAND-USE SEGMENTATION</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: '#10b981' }}>
            {classifications.length || summary?.total_classifications || 6} Classes
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>64.2% Agricultural Primary</div>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CANDIDATE BOUNDARIES</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: '#f59e0b' }}>
            {boundaries.length || summary?.total_candidate_boundaries || 4} Candidates
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Multi-sensor LiDAR Ridge Fusion</div>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HISTORICAL CHANGES</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: '#f97316' }}>
            {changes.length || summary?.total_changes_detected || 4} Shifts
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>1998 Cadastre vs 2026 Resurvey</div>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>POTENTIAL ENCROACHMENTS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: '#ef4444' }}>
            {changes.filter((c) => c.severity === 'CRITICAL_ENCROACHMENT').length || summary?.potential_encroachments || 1} Alert
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Requires Official Field Confirmation</div>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #c084fc' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AI MODELS DEPLOYED</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: '#c084fc' }}>
            {aiModels.length || 4} Active
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>BaseAIModel Swappable</div>
        </div>
      </div>

      {/* Main 2-Column Workstation: Left Map (18 Layers), Right AI Inspector & Verification */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 1.4fr) minmax(340px, 1fr)', gap: '1.25rem' }}>
        {/* Left: 18-Layer Interactive GIS Map */}
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
              <Layers size={16} style={{ color: 'var(--text-emerald)' }} /> 18-Layer AI GIS Map
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              EPSG:4326 &bull; Real-World Scale 1m:1.000m
            </span>
          </div>

          <GisMap
            survey={selectedSurvey}
            height="580px"
            aiClassifications={classifications}
            aiBoundaries={boundaries}
            aiChanges={changes}
          />
        </div>

        {/* Right: AI Intelligence Panel & Human-in-the-Loop Workbench */}
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Submodule Tab Switcher */}
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('boundaries')}
              className={`btn btn-sm ${activeTab === 'boundaries' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              Candidate Bunds ({boundaries.length})
            </button>
            <button
              onClick={() => setActiveTab('classification')}
              className={`btn btn-sm ${activeTab === 'classification' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              Land-Use (8)
            </button>
            <button
              onClick={() => setActiveTab('changes')}
              className={`btn btn-sm ${activeTab === 'changes' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              Changes ({changes.length})
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`btn btn-sm ${activeTab === 'models' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              Models ({aiModels.length})
            </button>
          </div>

          {/* TAB 1: Boundary Intelligence & Verification */}
          {activeTab === 'boundaries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '520px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Multi-sensor candidate boundaries extracted from LiDAR bund ridges + RGB texture gradients.
                <em> Candidates must be certified by a surveyor before legal adoption.</em>
              </div>

              {boundaries.map((bnd) => {
                const isVerified = bnd.verification_status === 'VERIFIED';
                const isRejected = bnd.verification_status === 'REJECTED';

                return (
                  <div
                    key={bnd.boundary_id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{bnd.boundary_id}</div>
                      <span className={`badge ${isVerified ? 'badge-emerald' : isRejected ? 'badge-rose' : 'badge-amber'}`}>
                        {bnd.verification_status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem', display: 'flex', gap: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Type: <strong>{bnd.boundary_type.replace(/_/g, ' ')}</strong></span>
                      <span>Confidence: <strong style={{ color: '#10b981' }}>{(bnd.confidence * 100).toFixed(0)}%</strong></span>
                    </div>

                    <div style={{ fontSize: '0.74rem' }}>
                      Length: <strong>{bnd.length_m.toFixed(1)} m</strong> | Est. Area: <strong>{bnd.estimated_area_m2.toLocaleString()} m²</strong>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Sensors: {bnd.sources.join(' + ')}
                    </div>

                    {!isVerified && !isRejected && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                        <button
                          onClick={() => handleVerifyBoundary(bnd.boundary_id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.72rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                        >
                          <CheckCircle2 size={12} /> Accept / Verify
                        </button>
                        <button
                          onClick={() => handleRejectBoundary(bnd.boundary_id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#ef4444' }}
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Land Classification Distribution */}
          {activeTab === 'classification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '520px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                8-Class semantic segmentation breakdown across survey orthomosaic (2.5cm/px).
              </div>

              {classifications.map((cls, idx) => (
                <div
                  key={`cls-item-${idx}`}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{cls.class}</span>
                    <span className="badge badge-emerald">{(cls.confidence * 100).toFixed(0)}% Conf</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>Coverage: <strong>{cls.percentage}%</strong></span>
                    <span>Area: <strong>{cls.area_hectares} ha ({cls.area_m2.toLocaleString()} m²)</strong></span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${cls.percentage}%`,
                        height: '100%',
                        backgroundColor: cls.class === 'AGRICULTURAL' ? '#10b981' : cls.class === 'WATER' ? '#0ea5e9' : '#f59e0b',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Change Detection & Potential Encroachments */}
          {activeTab === 'changes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '520px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Temporal comparison against 1998 Cadastral baseline.
              </div>

              {changes.map((chg) => {
                const isCrit = chg.severity === 'CRITICAL_ENCROACHMENT';

                return (
                  <div
                    key={chg.change_id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: isCrit ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                      backgroundColor: isCrit ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{chg.change_id}</span>
                      <span className={`badge ${isCrit ? 'badge-rose' : 'badge-amber'}`}>
                        {chg.change_type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Historical:</span> {chg.old_value}
                    </div>
                    <div style={{ fontSize: '0.76rem' }}>
                      <strong style={{ color: isCrit ? '#ef4444' : 'var(--text-primary)' }}>Resurvey:</strong> {chg.new_value}
                    </div>

                    <div style={{ fontSize: '0.74rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <span>Affected: <strong>{chg.area_affected_m2} m²</strong></span>
                      <span>Drift: <strong>{chg.percentage_change}%</strong></span>
                      <span>Conf: <strong>{(chg.confidence * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: Model Registry */}
          {activeTab === 'models' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '520px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Production Model Abstraction Registry (BaseAIModel).
              </div>

              {aiModels.map((m) => (
                <div
                  key={m.model_id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.model_name}</span>
                    <span className="badge badge-emerald">{m.status}</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ID: <code>{m.model_id}</code> | v{m.version}
                  </div>

                  <div style={{ fontSize: '0.74rem' }}>
                    Framework: <strong>{m.framework}</strong>
                  </div>

                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Sensors: {m.sensor_requirements?.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
