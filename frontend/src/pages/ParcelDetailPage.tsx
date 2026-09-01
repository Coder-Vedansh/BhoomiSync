import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  LandParcelDTO,
  ParcelComparisonDTO,
  CadastralVersionDTO,
  ParcelChangeRecordDTO,
  ParcelDocumentDTO,
  UserRole,
} from '../types';
import { GisMap } from '../components/gis/GisMap';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  AlertTriangle,
  Scale,
  Download,
  Lock,
  UserCheck,
  Database,
} from 'lucide-react';

interface ParcelDetailPageProps {
  parcelId?: string;
  onBack?: () => void;
}

export const ParcelDetailPage: React.FC<ParcelDetailPageProps> = ({ parcelId: propParcelId, onBack }) => {
  const effectiveParcelId = propParcelId || 'BS-P-001';


  const [role, setRole] = useState<UserRole>('SURVEYOR');
  const [parcel, setParcel] = useState<LandParcelDTO | null>(null);
  const [comparison, setComparison] = useState<ParcelComparisonDTO | null>(null);
  const [history, setHistory] = useState<CadastralVersionDTO[]>([]);
  const [changes, setChanges] = useState<ParcelChangeRecordDTO[]>([]);
  const [documents, setDocuments] = useState<ParcelDocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification Form State
  const [surveyorComment, setSurveyorComment] = useState('Boundary verified against centimeter-grade RTK drone orthomosaic.');
  const [verificationStatus, setVerificationStatus] = useState('SURVEYOR_VERIFIED');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Document Upload State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('SURVEY_DOCUMENT');
  const [docFormat, setDocFormat] = useState('PDF');

  const fetchAllData = async () => {
    if (!effectiveParcelId) return;
    setLoading(true);
    try {
      const [pRes, cRes, hRes, chgRes, dRes] = await Promise.all([
        api.getLandParcelDetail(effectiveParcelId, role).catch(() => null),
        api.getParcelComparison(effectiveParcelId).catch(() => null),
        api.getParcelHistory(effectiveParcelId).catch(() => ({ versions: [] })),
        api.getParcelChanges(effectiveParcelId).catch(() => ({ changes: [] })),
        api.getParcelDocuments(effectiveParcelId).catch(() => ({ documents: [] })),
      ]);

      if (pRes) setParcel(pRes);
      if (cRes) setComparison(cRes);
      if (hRes?.versions) setHistory(hRes.versions);
      if (chgRes?.changes) setChanges(chgRes.changes);
      if (dRes?.documents) setDocuments(dRes.documents);
    } catch (err) {
      console.error('Failed to load parcel detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [effectiveParcelId, role]);

  const handleVerifyParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveParcelId) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyParcelBoundary(effectiveParcelId, {
        status: verificationStatus,
        surveyor_comment: surveyorComment,
        verified_area_m2: parcel?.drone_measured_area_m2 || parcel?.official_area_m2,
      });
      setVerificationMessage(res.message || 'Parcel successfully verified by surveyor.');
      fetchAllData();
      setTimeout(() => setVerificationMessage(null), 3000);
    } catch (err: any) {
      setVerificationMessage(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveParcelId || !docTitle.trim()) return;
    try {
      await api.attachParcelDocument(effectiveParcelId, {
        title: docTitle.trim(),
        document_type: docType,
        file_format: docFormat,
        source: 'Sub-Registrar Office / Tehsil Record Room',
      });
      setIsDocModalOpen(false);
      setDocTitle('');
      fetchAllData();
    } catch (err: any) {
      console.error('Failed to attach document:', err);
    }
  };

  if (loading && !parcel) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading parcel cadastral intelligence...
      </div>
    );
  }

  if (!parcel) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
        <h2>Parcel Not Found</h2>
        <p style={{ color: 'var(--text-muted)' }}>Could not locate cadastral record for ID: {effectiveParcelId}</p>
        <button onClick={() => onBack && onBack()} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
          ← Back to Land Records
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Header & Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <button
            onClick={() => onBack && onBack()}
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: '0.4rem', padding: '0.2rem 0', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ArrowLeft size={14} /> Back to Land Records Registry
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Khasra {parcel.survey_number}
            </h1>
            <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>
              {parcel.land_use.replace(/_/g, ' ')}
            </span>
            <span className={`badge ${parcel.verification_status === 'SURVEYOR_VERIFIED' ? 'badge-emerald' : 'badge-amber'}`}>
              {parcel.verification_status.replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Parcel ID: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{parcel.parcel_id}</strong> • Village: {parcel.village}, Tehsil: {parcel.tehsil}, District: {parcel.district}, {parcel.state}
          </div>
        </div>

        {/* Role Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.2rem',
            gap: '0.2rem',
          }}
        >
          <button
            onClick={() => setRole('PUBLIC')}
            className={`btn btn-sm ${role === 'PUBLIC' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Lock size={12} /> Public (Masked)
          </button>
          <button
            onClick={() => setRole('SURVEYOR')}
            className={`btn btn-sm ${role === 'SURVEYOR' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <UserCheck size={12} /> Surveyor
          </button>
          <button
            onClick={() => setRole('ADMIN')}
            className={`btn btn-sm ${role === 'ADMIN' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Database size={12} /> Admin
          </button>
        </div>
      </div>

      {/* Legal Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          backgroundColor: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.85rem',
          fontSize: '0.75rem',
          color: '#eab308',
        }}
      >
        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        <span>
          <strong>DEMO / SIMULATED DATA:</strong> BhoomiSync measurements are high-precision spatial calculations. Official mutation deeds and court records are governed by Rajasthan Land Revenue Act.
        </span>
      </div>

      {/* 2. 4-Way Area Comparison Panel */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem' }}>
            <Scale size={16} style={{ color: 'var(--text-emerald)' }} />
            4-Way Authoritative Area & Geometry Comparison
          </div>
          {comparison && (
            <span className={`badge ${comparison.classification_status === 'NO_SIGNIFICANT_CHANGE' ? 'badge-emerald' : comparison.classification_status === 'MINOR_DISCREPANCY' ? 'badge-amber' : 'badge-rose'}`}>
              {comparison.classification_status.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {comparison ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 4 Area Columns Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {/* 1. Official Area */}
              <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#eab308', fontWeight: 700, textTransform: 'uppercase' }}>
                  1. Official Revenue Area
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  {comparison.official_area.sq_meters.toLocaleString()} m²
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {comparison.official_area.hectares} ha • {comparison.official_area.acres} acres
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Source: Apna Khata Jamabandi
                </div>
              </div>

              {/* 2. Drone Measured Area */}
              <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase' }}>
                  2. Drone Measured (RTK/LiDAR)
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-emerald)', marginTop: '0.2rem' }}>
                  {comparison.drone_area ? `${comparison.drone_area.sq_meters.toLocaleString()} m²` : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {comparison.drone_area ? `${comparison.drone_area.hectares} ha • ${comparison.drone_area.acres} acres` : 'Pending'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Source: BhoomiSync Fusion Pipeline
                </div>
              </div>

              {/* 3. Historical Area */}
              <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase' }}>
                  3. 1998 Historical Cadastre
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.2rem' }}>
                  {comparison.historical_area ? `${comparison.historical_area.sq_meters.toLocaleString()} m²` : `${comparison.official_area.sq_meters.toLocaleString()} m²`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {comparison.historical_area ? `${comparison.historical_area.hectares} ha` : `${comparison.official_area.hectares} ha`}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Source: 1998 Settlement Survey
                </div>
              </div>

              {/* 4. Surveyor-Verified Area */}
              <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                  4. Surveyor Verified
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                  {comparison.verified_area ? `${comparison.verified_area.sq_meters.toLocaleString()} m²` : (parcel.verified_area_m2 ? `${parcel.verified_area_m2.toLocaleString()} m²` : 'Pending')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {comparison.verified_area ? `${comparison.verified_area.hectares} ha` : (parcel.verified_area_m2 ? `${(parcel.verified_area_m2 / 10000).toFixed(4)} ha` : 'Awaiting signoff')}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Status: {parcel.verification_status}
                </div>
              </div>
            </div>

            {/* Drift Diagnostics & Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', padding: '0.75rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Area Difference:</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: comparison.area_difference_m2 && Math.abs(comparison.area_difference_m2) > 100 ? '#ef4444' : 'var(--text-primary)' }}>
                  {comparison.area_difference_m2 ? `${comparison.area_difference_m2 > 0 ? '+' : ''}${comparison.area_difference_m2} m²` : '0 m²'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Percentage Drift:</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: comparison.percentage_difference && Math.abs(comparison.percentage_difference) > 2 ? '#ef4444' : '#10b981' }}>
                  {comparison.percentage_difference ? `${comparison.percentage_difference > 0 ? '+' : ''}${comparison.percentage_difference}%` : '0.0%'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Perimeter Difference:</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {comparison.perimeter_difference_m ? `${comparison.perimeter_difference_m > 0 ? '+' : ''}${comparison.perimeter_difference_m} m` : '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max Displacement:</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {comparison.boundary_displacement_max_m ? `${comparison.boundary_displacement_max_m} m` : '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Centroid Offset:</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {comparison.centroid_displacement_m ? `${comparison.centroid_displacement_m} m` : '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Spatial Overlap IoU:</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>
                  {comparison.overlap_percentage ? `${comparison.overlap_percentage}%` : '95.5%'}
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0.75rem', borderLeft: '3px solid var(--text-emerald)', backgroundColor: 'var(--bg-canvas)' }}>
              {comparison.explanation}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            Comparing parcel boundaries...
          </div>
        )}
      </div>

      {/* 3. 4-Boundary Overlaid GIS Map & Title Holder */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1.2fr)', gap: '1.25rem' }}>
        {/* Left: GIS Map */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={15} style={{ color: 'var(--text-emerald)' }} />
              Parcel Boundary Overlay Map (4 Boundary Layers)
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Gold: Official • Cyan: Drone • Purple: 1998 • Green: Verified
            </span>
          </div>

          <GisMap
            center={[24.5854, 73.7125]}
            zoom={17}
            landParcels={[parcel]}
            selectedParcelId={parcel.parcel_id}
            height="460px"
          />
        </div>

        {/* Right: Title Holders & Khatedar Profile */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              Ownership Title & Khatedar Profile
            </div>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              {parcel.ownership_status}
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Primary Khatedar Name
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>
              {role === 'PUBLIC' ? parcel.owner_masked_reference : (parcel.primary_owner_name || 'Khatedar Registered')}
            </div>
            {role === 'PUBLIC' && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-amber)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Lock size={11} /> Personal details masked under public access privacy protocol.
              </div>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div>Owner Ref: <span className="font-mono">{parcel.owner_reference || 'OWN-HR-001'}</span></div>
              <div>Sub-division: Part {parcel.subdivision_number || '1'}</div>
              <div>Authority: {parcel.land_record_source || 'Rajasthan Revenue Department'}</div>
            </div>
          </div>

          {/* Surveyor Verification Action Form */}
          <form onSubmit={handleVerifyParcel} style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              Surveyor Boundary Verification Sign-Off
            </div>
            <textarea
              rows={3}
              value={surveyorComment}
              onChange={(e) => setSurveyorComment(e.target.value)}
              placeholder="Add surveyor adjudication notes..."
              className="input"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="input"
                style={{ fontSize: '0.75rem', height: '34px', flex: 1 }}
              >
                <option value="SURVEYOR_VERIFIED">Sign Off as SURVEYOR_VERIFIED</option>
                <option value="DISPUTED">Mark as DISPUTED</option>
                <option value="PENDING">Keep PENDING</option>
              </select>

              <button
                type="submit"
                disabled={isVerifying}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <ShieldCheck size={13} /> {isVerifying ? 'Saving...' : 'Authorize'}
              </button>
            </div>

            {verificationMessage && (
              <div style={{ fontSize: '0.75rem', color: verificationMessage.includes('failed') ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                {verificationMessage}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 4. Bottom Tabs: Historical Evolution, Change Log, and Document Vault */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Historical Evolution Timeline */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} style={{ color: '#a855f7' }} />
            Cadastral Evolution & Version History ({history.length} versions)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {history.map((ver) => (
              <div
                key={ver.id}
                style={{
                  padding: '0.65rem 0.8rem',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-emerald)' }}>{ver.version_number}</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {ver.effective_date ? new Date(ver.effective_date).toLocaleDateString() : 'Baseline'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {ver.change_reason || 'Official Settlement Record'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Area: {ver.area_m2.toLocaleString()} m² • Source: {ver.source}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prompt 4 AI Change Detections */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={16} style={{ color: '#f97316' }} />
            AI Land Change & Encroachment Log ({changes.length})
          </div>

          {changes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {changes.map((chg) => (
                <div
                  key={chg.id}
                  style={{
                    padding: '0.65rem 0.8rem',
                    backgroundColor: 'var(--bg-canvas)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${chg.severity === 'CRITICAL_ENCROACHMENT' ? 'badge-rose' : 'badge-amber'}`}>
                      {chg.change_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {(chg.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    {chg.surveyor_comment || 'Boundary divergence detected between official cadastre and drone orthomosaic.'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Shift: {chg.boundary_shift_m}m • Area Diff: {chg.area_difference_m2} m²
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No critical boundary shifts or unauthorized structures detected on this parcel.
            </div>
          )}
        </div>

        {/* Associated Documents Vault */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} style={{ color: '#06b6d4' }} />
              Documents Vault ({documents.length})
            </div>
            <button onClick={() => setIsDocModalOpen(true)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
              + Attach Document
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  padding: '0.65rem 0.8rem',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{doc.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {doc.document_type} • {doc.file_format} • {(doc.file_size_bytes / 1024).toFixed(1)} KB
                  </div>
                  {doc.checksum && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      SHA256: {doc.checksum.slice(0, 16)}...
                    </div>
                  )}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ padding: '0.3rem' }} title="Download / View Reference">
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attach Document Modal */}
      {isDocModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Attach Legal / Survey Document</h3>
            <form onSubmit={handleAttachDocument} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jamabandi 2026 Nakal"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8rem', height: '36px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8rem', height: '36px' }}
                  >
                    <option value="OWNERSHIP_RECORD">Ownership Record</option>
                    <option value="CADASTRAL_MAP">Cadastral Map</option>
                    <option value="SURVEY_DOCUMENT">Survey Document</option>
                    <option value="MUTATION_DEED">Mutation Deed</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    Format
                  </label>
                  <select
                    value={docFormat}
                    onChange={(e) => setDocFormat(e.target.value)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8rem', height: '36px' }}
                  >
                    <option value="PDF">PDF</option>
                    <option value="GEOJSON">GeoJSON</option>
                    <option value="TIFF">TIFF</option>
                    <option value="PNG">PNG</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Document Reference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
