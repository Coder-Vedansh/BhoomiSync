import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Search, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Survey } from '../types';

interface SurveysPageProps {
  onSelectSurvey: (surveyId: string) => void;
}

export const SurveysPage: React.FC<SurveysPageProps> = ({ onSelectSurvey }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Survey Form State
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newState, setNewState] = useState('');
  const [newArea, setNewArea] = useState('10.0');

  useEffect(() => {
    loadSurveys();
  }, []);

  async function loadSurveys() {
    try {
      const data = await api.getSurveys();
      setSurveys(data);
    } catch (e) {
      console.error('Failed to load surveys', e);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSurvey({
        name: newName,
        location: newLocation,
        district: newDistrict,
        state: newState,
        total_area_hectares: parseFloat(newArea) || 0,
        center_latitude: 24.5854,
        center_longitude: 73.7125,
      });
      setIsModalOpen(false);
      setNewName('');
      setNewLocation('');
      loadSurveys();
    } catch (err) {
      alert('Error creating survey: ' + err);
    }
  };

  const filteredSurveys = surveys.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.survey_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Agricultural Survey Missions</h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Manage cadastral mapping campaigns, sensor acquisitions, and boundary verification.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Register New Survey
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by survey ID, village name, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.2rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Surveys List */}
      <div className="grid-3">
        {filteredSurveys.map((survey) => (
          <div
            key={survey.id}
            onClick={() => onSelectSurvey(survey.survey_id)}
            className="card"
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)', fontSize: '0.95rem' }}>
                {survey.survey_id}
              </div>
              <span className={`badge ${survey.status === 'COMPLETED' ? 'badge-emerald' : 'badge-amber'}`}>
                {survey.status}
              </span>
            </div>

            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>{survey.name}</h3>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
              {survey.location}, {survey.district || 'Udaipur'}
            </div>

            <div className="grid-2" style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.78rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Survey Area</div>
                <strong>{survey.total_area_hectares} ha</strong>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Parcels / Datasets</div>
                <strong>{survey.parcel_count} parcels / {survey.dataset_count} sets</strong>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{new Date(survey.survey_date).toLocaleDateString()}</span>
              <span style={{ color: 'var(--text-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Open Mission <ArrowRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* New Survey Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.75rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Register New Agricultural Survey</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Mission Name
                </label>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Badgaon Village Resurvey Mission"
                  style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Village / Tehsil
                  </label>
                  <input
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Badgaon"
                    style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    District
                  </label>
                  <input
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="Udaipur"
                    style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    State
                  </label>
                  <input
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="Rajasthan"
                    style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                    Area (Hectares)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Survey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
