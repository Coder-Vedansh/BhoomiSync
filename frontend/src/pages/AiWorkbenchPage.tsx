import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { AIModule } from '../types';

export const AiWorkbenchPage: React.FC = () => {
  const [modules, setModules] = useState<AIModule[]>([]);
  const [runningModule, setRunningModule] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getAiModules();
        setModules(res.modules);
      } catch (err) {
        console.error('Failed to load AI modules', err);
      }
    }
    load();
  }, []);

  const handleRunModule = async (moduleId: string) => {
    try {
      setRunningModule(moduleId);
      setExecutionResult(null);

      let result;
      if (moduleId === 'AI-MOD-01') {
        result = await api.runLandClassification('SUR-2026-001', 'DS-2026-001-ORTHO');
      } else if (moduleId === 'AI-MOD-02') {
        result = await api.runParcelBoundaryDetection('SUR-2026-001', 'DS-2026-001-ORTHO');
      } else if (moduleId === 'AI-MOD-03') {
        result = await api.runChangeDetection('SUR-2026-001', 'HIST-REV-1988', 'DS-2026-001-ORTHO');
      }
      setExecutionResult(result);
    } catch (err) {
      alert('AI Execution Error: ' + err);
    } finally {
      setRunningModule(null);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>AI Intelligence & Segmentation Modules</h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Model-agnostic computer vision and cadastral vectorization. Decoupled from specific neural architectures.
        </p>
      </div>

      {/* AI Modules Grid */}
      <div className="grid-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        {modules.map((mod) => (
          <div key={mod.module_id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-purple)', fontWeight: 700 }}>
                  {mod.module_id}
                </span>
                <h3 style={{ fontSize: '1.05rem', margin: '0.2rem 0' }}>{mod.name}</h3>
              </div>
              <span className="badge badge-purple">v{mod.version}</span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', flex: 1 }}>
              {mod.description}
            </p>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.75rem' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Supported Inputs:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {(mod.supported_inputs || mod.inputs || []).map((inp: string) => (
                  <span key={inp} className="badge badge-slate" style={{ fontSize: '0.65rem' }}>
                    {inp}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleRunModule(mod.module_id)}
              disabled={runningModule !== null}
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              <Play size={14} /> {runningModule === mod.module_id ? 'Executing Pipeline...' : 'Test Inference Pipeline'}
            </button>
          </div>
        ))}
      </div>

      {/* Execution Results Drawer */}
      {executionResult && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)', background: 'linear-gradient(180deg, #162635 0%, #111a24 100%)' }}>
          <div className="card-header">
            <h3 className="card-title">
              <CheckCircle2 size={18} style={{ color: 'var(--text-emerald)' }} />
              Simulated AI Inference Output Manifest
            </h3>
            <span className="badge badge-emerald">Inference Complete</span>
          </div>

          <pre
            className="font-mono"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-emerald)',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(executionResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
