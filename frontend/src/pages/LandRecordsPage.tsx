import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LandParcelDTO, UserRole } from '../types';
import { GisMap } from '../components/gis/GisMap';
import {
  FileText,
  ShieldCheck,
  UploadCloud,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  UserCheck,
  RefreshCw,
  X,
  Scale,
} from 'lucide-react';

interface LandRecordsPageProps {
  onNavigate?: (tab: string, id?: string) => void;
}

export const LandRecordsPage: React.FC<LandRecordsPageProps> = ({ onNavigate }) => {
  const [role, setRole] = useState<UserRole>('SURVEYOR');
  const [parcels, setParcels] = useState<LandParcelDTO[]>([]);
  const [totalParcels, setTotalParcels] = useState(0);
  const [selectedParcel, setSelectedParcel] = useState<LandParcelDTO | null>(null);

  const goToDetail = (parcelId: string) => {
    if (onNavigate) {
      onNavigate('parcel-detail', parcelId);
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('All');
  const [selectedLandUse, setSelectedLandUse] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSourceType, setImportSourceType] = useState('CSV');
  const [importSourceName, setImportSourceName] = useState('Tehsil Girwa Cadastral Record Batch');
  const [importRawContent, setImportRawContent] = useState('');
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  const fetchParcels = async () => {
    try {
      const filters: any = {};
      if (selectedVillage !== 'All') filters.village = selectedVillage;
      if (selectedLandUse !== 'All') filters.land_use = selectedLandUse;
      if (selectedStatus !== 'All') filters.verification_status = selectedStatus;
      if (searchQuery.trim()) filters.search_query = searchQuery.trim();

      const res = await api.getLandParcels(filters, role);
      setParcels(res.parcels || []);
      setTotalParcels(res.total || 0);

      if (res.parcels && res.parcels.length > 0 && !selectedParcel) {
        setSelectedParcel(res.parcels[0]);
      }
    } catch (err) {
      console.error('Failed to load land records:', err);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, [role, selectedVillage, selectedLandUse, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParcels();
  };

  const handleExecuteImport = async () => {
    if (!importRawContent.trim()) {
      setImportStatusMessage('Please provide file content or paste CSV/GeoJSON data.');
      return;
    }
    setImportStatusMessage('Processing batch import...');
    try {
      const res = await api.importLandRecords({
        source_name: importSourceName,
        source_type: importSourceType,
        raw_content: importRawContent,
        filename: `batch_import_${Date.now()}.${importSourceType.toLowerCase()}`,
        imported_by: role === 'ADMIN' ? 'ADMIN_SUPERUSER' : 'SURVEYOR_OFFICIAL',
      });
      setImportStatusMessage(`Import Completed: ${res.successful_records} created, ${res.duplicate_records} duplicates.`);
      fetchParcels();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatusMessage(null);
        setImportRawContent('');
      }, 1500);
    } catch (err: any) {
      setImportStatusMessage(`Import Failed: ${err.message || 'Validation error'}`);
    }
  };

  // Metrics computation
  const verifiedCount = parcels.filter((p) => p.verification_status === 'SURVEYOR_VERIFIED').length;
  const disputedCount = parcels.filter((p) => p.ownership_status === 'DISPUTED' || p.match_status === 'CONFLICT').length;
  const divergenceCount = parcels.filter((p) => p.area_difference_percentage && Math.abs(p.area_difference_percentage) > 2.0).length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Page Header & Role Privacy Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Land Records, Ownership & Cadastre
            </h1>
            <span className="badge badge-emerald" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldCheck size={12} /> CADASTRE REGISTRY
            </span>

          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
            Authoritative revenue parcel registry cross-referenced with centimeter-accurate drone geospatial measurements.
          </p>
        </div>

        {/* Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              <UserCheck size={12} /> Surveyor (Full)
            </button>
            <button
              onClick={() => setRole('ADMIN')}
              className={`btn btn-sm ${role === 'ADMIN' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Database size={12} /> Admin (Audit)
            </button>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <UploadCloud size={14} /> Import Records
          </button>
        </div>
      </div>

      {/* Legal Disclaimer Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 1rem',
          fontSize: '0.78rem',
          color: '#eab308',
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        <div>
          <strong>DEMO / SIMULATED DATASET NOTICE:</strong> Cadastral parcels and owner records shown are representative simulated data modeled on Rajasthan Land Revenue rules for technical verification. Final legal boundary determinations require field surveyor adjudication.
        </div>
      </div>

      {/* 2. Top Analytics Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PARCELS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalParcels}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-emerald)' }}>Haripura Village Pilot</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SURVEYOR VERIFIED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{verifiedCount}</div>
            <div style={{ fontSize: '0.7rem', color: '#06b6d4' }}>{((verifiedCount / (totalParcels || 1)) * 100).toFixed(0)}% Authoritative</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
            <Scale size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AREA VARIATION &gt; 2%</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{divergenceCount}</div>
            <div style={{ fontSize: '0.7rem', color: '#f97316' }}>Resurvey Candidates</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.65rem', borderRadius: 'var(--radius-md)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONFLICTS / ENCROACHMENTS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{disputedCount}</div>
            <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>Inspection Required</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Tool Bar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 240px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Khasra no, Owner, Parcel ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.8rem', height: '36px' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '36px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Filter size={13} /> Village:
          </div>
          <select
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            className="input"
            style={{ fontSize: '0.8rem', height: '36px', padding: '0 0.5rem' }}
          >
            <option value="All">All Villages</option>
            <option value="Haripura">Haripura (Girwa)</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Land Use:
          </div>
          <select
            value={selectedLandUse}
            onChange={(e) => setSelectedLandUse(e.target.value)}
            className="input"
            style={{ fontSize: '0.8rem', height: '36px', padding: '0 0.5rem' }}
          >
            <option value="All">All Land Uses</option>
            <option value="AGRICULTURAL">Agricultural</option>
            <option value="FALLOW_LAND">Fallow Land</option>
            <option value="WATER_BODY">Water Body</option>
            <option value="SETTLEMENT">Settlement</option>
            <option value="ROAD_NETWORK">Road Network</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Status:
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
            style={{ fontSize: '0.8rem', height: '36px', padding: '0 0.5rem' }}
          >
            <option value="All">All Statuses</option>
            <option value="SURVEYOR_VERIFIED">Surveyor Verified</option>
            <option value="AUTO_MATCHED">Auto Matched</option>
            <option value="PENDING">Pending Review</option>
            <option value="DISPUTED">Disputed</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedVillage('All');
              setSelectedLandUse('All');
              setSelectedStatus('All');
            }}
            className="btn btn-ghost btn-sm"
            title="Reset Filters"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 4. Main Workbench: 24-Layer GIS Map & Parcel Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: '1.25rem' }}>
        {/* Left: GIS Map */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={15} style={{ color: 'var(--text-emerald)' }} />
              24-Layer Cadastral GIS Workbench
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click any parcel to inspect title and drone metrics
            </span>
          </div>

          <GisMap
            center={[24.5854, 73.7125]}
            zoom={16}
            landParcels={parcels}
            selectedParcelId={selectedParcel?.parcel_id}
            onSelectLandParcel={(lp) => setSelectedParcel(lp)}
            height="540px"
          />
        </div>

        {/* Right: Quick Parcel Inspector Drawer */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {selectedParcel ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      Khasra {selectedParcel.survey_number}
                    </h2>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                      {selectedParcel.land_use.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Parcel ID: <span className="font-mono">{selectedParcel.parcel_id}</span> • {selectedParcel.village}, {selectedParcel.tehsil}
                  </div>
                </div>

                <span className={`badge ${selectedParcel.verification_status === 'SURVEYOR_VERIFIED' ? 'badge-emerald' : 'badge-amber'}`}>
                  {selectedParcel.verification_status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Ownership Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Title Holder (Khatedar)
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {role === 'PUBLIC' ? selectedParcel.owner_masked_reference : (selectedParcel.primary_owner_name || 'Registered Khatedar')}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span>Status: <strong style={{ color: selectedParcel.ownership_status === 'DISPUTED' ? '#ef4444' : 'var(--text-emerald)' }}>{selectedParcel.ownership_status}</strong></span>
                  <span>Record: {selectedParcel.land_record_source || 'Apna Khata'}</span>
                </div>
              </div>

              {/* 4-Way Area Metrics Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Official Record Area</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                    {selectedParcel.official_area_m2.toLocaleString()} m²
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedParcel.official_area_hectares} ha</div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-emerald)' }}>Drone Measured Area</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-emerald)' }}>
                    {selectedParcel.drone_measured_area_m2 ? `${selectedParcel.drone_measured_area_m2.toLocaleString()} m²` : 'Pending'}
                  </div>
                  {selectedParcel.area_difference_percentage !== undefined && (
                    <div style={{ fontSize: '0.7rem', color: Math.abs(selectedParcel.area_difference_percentage) > 2 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      {selectedParcel.area_difference_percentage > 0 ? '+' : ''}{selectedParcel.area_difference_percentage}% difference
                    </div>
                  )}
                </div>
              </div>

              {/* Match Diagnostics */}
              <div style={{ backgroundColor: 'var(--bg-canvas)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                  <span>Spatial Match Confidence:</span>
                  <strong>{((selectedParcel.match_confidence || 0.95) * 100).toFixed(1)}%</strong>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(selectedParcel.match_confidence || 0.95) * 100}%`, backgroundColor: '#10b981' }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {selectedParcel.notes || 'Official cadastre boundary verified against centimeter-resolution drone orthomosaic.'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button
                  onClick={() => goToDetail(selectedParcel.parcel_id)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  Deep Dive & 4-Way Compare <ExternalLink size={13} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Select a parcel from the map or table to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* 5. Searchable Parcel Data Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            Authoritative Parcel Registry ({parcels.length} of {totalParcels} records)
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Role View: <strong>{role}</strong>
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 1rem' }}>Parcel ID</th>
                <th style={{ padding: '0.65rem 1rem' }}>Khasra No</th>
                <th style={{ padding: '0.65rem 1rem' }}>Title Holder / Khatedar</th>
                <th style={{ padding: '0.65rem 1rem' }}>Official Area</th>
                <th style={{ padding: '0.65rem 1rem' }}>Drone Area</th>
                <th style={{ padding: '0.65rem 1rem' }}>Diff %</th>
                <th style={{ padding: '0.65rem 1rem' }}>Land Use</th>
                <th style={{ padding: '0.65rem 1rem' }}>Verification</th>
                <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const isSelected = selectedParcel?.parcel_id === p.parcel_id;
                const hasDivergence = p.area_difference_percentage && Math.abs(p.area_difference_percentage) > 2.0;

                return (
                  <tr
                    key={p.parcel_id}
                    onClick={() => setSelectedParcel(p)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : undefined,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {p.parcel_id}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>
                      {p.survey_number}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {role === 'PUBLIC' ? (
                        <span style={{ color: 'var(--text-muted)' }}>{p.owner_masked_reference}</span>
                      ) : (
                        <span>{p.primary_owner_name || 'Khatedar Registered'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {p.official_area_m2.toLocaleString()} m² ({p.official_area_hectares} ha)
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: 'var(--text-emerald)', fontWeight: 600 }}>
                      {p.drone_measured_area_m2 ? `${p.drone_measured_area_m2.toLocaleString()} m²` : '—'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {p.area_difference_percentage !== undefined ? (
                        <span className={`badge ${hasDivergence ? 'badge-rose' : 'badge-emerald'}`}>
                          {p.area_difference_percentage > 0 ? '+' : ''}{p.area_difference_percentage}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span className="badge badge-indigo">{p.land_use?.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span className={`badge ${p.verification_status === 'SURVEYOR_VERIFIED' ? 'badge-emerald' : 'badge-amber'}`}>
                        {p.verification_status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(p.parcel_id);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Inspect <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Batch Import Modal */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '620px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-xl)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UploadCloud size={20} style={{ color: 'var(--text-emerald)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Batch Land Record & Cadastre Importer
                </h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="btn btn-ghost btn-sm">
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Import authoritative cadastral datasets in CSV, GeoJSON FeatureCollection, or JSON format. Schema validations and SHA-256 checksums are recorded automatically.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Format Source Type
                </label>
                <select
                  value={importSourceType}
                  onChange={(e) => setImportSourceType(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8rem', height: '36px' }}
                >
                  <option value="CSV">CSV (Khasra & Area Table)</option>
                  <option value="GEOJSON">GeoJSON (Boundary Features)</option>
                  <option value="JSON">JSON (Standard Object Array)</option>
                  <option value="MOCK_GOV_DATASET">Mock Government Dataset (20 Parcels)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Dataset / Authority Name
                </label>
                <input
                  type="text"
                  value={importSourceName}
                  onChange={(e) => setImportSourceName(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8rem', height: '36px' }}
                />
              </div>
            </div>

            {importSourceType !== 'MOCK_GOV_DATASET' && (
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Paste Raw File Content ({importSourceType})
                </label>
                <textarea
                  rows={8}
                  value={importRawContent}
                  onChange={(e) => setImportRawContent(e.target.value)}
                  placeholder={
                    importSourceType === 'CSV'
                      ? 'parcel_id,survey_number,subdivision,village,tehsil,district,state,area_value,area_unit,land_use,owner_name,owner_type\nIMP-P-101,101,1,Haripura,Girwa,Udaipur,Rajasthan,12500,SQ_METER,AGRICULTURAL,Ramesh Patel,INDIVIDUAL'
                      : '{"type": "FeatureCollection", "features": [...]}'
                  }
                  className="input font-mono"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.5rem', lineHeight: '1.4' }}
                />
              </div>
            )}

            {importStatusMessage && (
              <div
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: importStatusMessage.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: importStatusMessage.includes('Failed') ? '#ef4444' : '#10b981',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                {importStatusMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button onClick={() => setIsImportModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleExecuteImport} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <UploadCloud size={14} /> Execute Import Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
