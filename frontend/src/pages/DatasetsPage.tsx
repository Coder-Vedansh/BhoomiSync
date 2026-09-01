import React, { useEffect, useState } from 'react';
import { Database, Lock } from 'lucide-react';
import { api } from '../services/api';
import { Dataset, DatasetFile } from '../types';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [files, setFiles] = useState<DatasetFile[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getSurveyDatasets('SUR-2026-001');
        setDatasets(list);
        if (list.length > 0) {
          selectDataset(list[0]);
        }
      } catch (err) {
        console.error('Failed to load datasets', err);
      }
    }
    load();
  }, []);

  const selectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    try {
      const fileList = await api.getDatasetFiles(dataset.dataset_id);
      setFiles(fileList);
    } catch (err) {
      console.error('Failed to load dataset files', err);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Dataset & File Repository</h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Object Storage pointers and cryptographic checksum verification. Raw acquisition layers remain preserved.
        </p>
      </div>

      <div className="grid-3" style={{ gap: '1.5rem' }}>
        {/* Datasets List */}
        <div style={{ gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Datasets Catalog</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {datasets.map((d) => (
              <div
                key={d.id}
                onClick={() => selectDataset(d)}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: '1rem',
                  borderColor: selectedDataset?.dataset_id === d.dataset_id ? 'var(--accent-emerald)' : undefined,
                  backgroundColor: selectedDataset?.dataset_id === d.dataset_id ? 'var(--bg-card-hover)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-emerald)' }}>
                    {d.dataset_id}
                  </span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                    {d.dataset_type}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  {d.description || d.source}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Files: {d.file_count || 1}</span>
                  <span>{d.is_immutable ? '🔒 Immutable' : 'Mutable'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Dataset Details & File Inspector */}
        <div style={{ gridColumn: 'span 2' }}>
          {selectedDataset ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card">
                <div className="card-header">
                  <div>
                    <span className="badge badge-emerald" style={{ marginBottom: '0.4rem' }}>
                      {selectedDataset.source}
                    </span>
                    <h3 style={{ fontSize: '1.2rem' }}>{selectedDataset.dataset_id}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-purple">
                      <Lock size={12} /> Preserved Layer
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {selectedDataset.description}
                </p>

                {/* Metadata JSON block */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Sensor & Acquisition Parameters
                  </div>
                  <pre className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--text-emerald)', overflowX: 'auto' }}>
                    {JSON.stringify(selectedDataset.metadata_json, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Stored Files Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <Database size={18} style={{ color: 'var(--text-cyan)' }} />
                    Object Storage Files ({files.length})
                  </h3>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File ID</th>
                        <th>Filename</th>
                        <th>Format</th>
                        <th>Size</th>
                        <th>Storage Key</th>
                        <th>SHA-256 Checksum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.id}>
                          <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)' }}>
                            {file.file_id}
                          </td>
                          <td style={{ fontWeight: 600 }}>{file.filename}</td>
                          <td>
                            <span className="badge badge-slate">{file.file_type}</span>
                          </td>
                          <td>{(file.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</td>
                          <td className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {file.storage_key}
                          </td>
                          <td className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {file.checksum.substring(0, 16)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              Select a dataset to inspect files and storage pointers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
