import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  Camera,
  Layers,
  Radio,
  CheckCircle2,
  RotateCw,
  Play,
  HardDrive,
  Cpu,
  FileCheck2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import {
  UploadSession,
  UploadedFile,
  ProcessingJob,
  Sensor,
} from '../types';

export const DroneIngestionPage: React.FC = () => {
  const [selectedSurveyId] = useState<string>('SUR-2026-001');
  const [, setSessions] = useState<UploadSession[]>([]);
  const [activeSession, setActiveSession] = useState<UploadSession | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  
  const [selectedSensorId, setSelectedSensorId] = useState<string>('SENSOR-RGB-SONY-01');
  const [activeTab, setActiveTab] = useState<'upload' | 'files' | 'jobs' | 'demo'>('upload');
  const [selectedFileForInspect, setSelectedFileForInspect] = useState<UploadedFile | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [sessionsData, filesData, jobsData, sensorsData] = await Promise.all([
        api.getUploadSessions(selectedSurveyId),
        api.getUploadedFiles(selectedSurveyId),
        api.getProcessingJobs(selectedSurveyId),
        api.getSensors(),
      ]);
      setSessions(sessionsData);
      if (sessionsData.length > 0) {
        setActiveSession(sessionsData[0]);
      }
      setFiles(filesData);
      setJobs(jobsData);
      setSensors(sensorsData);
      if (filesData.length > 0 && !selectedFileForInspect) {
        setSelectedFileForInspect(filesData[0]);
      }
    } catch (err) {
      console.error('Failed to load ingestion data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSurveyId]);

  // Handle Manual File Upload via HTML File Input
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setStatusMessage(`Uploading ${fileList.length} sensor file(s)...`);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('file', file);
        if (activeSession) {
          formData.append('session_id', activeSession.session_id);
        }
        formData.append('sensor_id', selectedSensorId);

        await api.uploadSurveyFile(selectedSurveyId, formData);
      }
      setStatusMessage(`Successfully uploaded and validated ${fileList.length} file(s)!`);
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Demo Mode: Trigger Simulated Drone Ingestion Batch
  const runSimulatedFlightBatch = async () => {
    setSimulating(true);
    setStatusMessage('Initiating Drone Ingestion Simulation (Camera EXIF + LiDAR + RTK)...');

    try {
      // 1. Create a fresh upload session
      const newSession = await api.createUploadSession(selectedSurveyId, {
        survey_id: 1,
        device_id: 'ESP32-DEMO-SIMULATOR',
        gateway_type: 'ESP32_PHONE',
        meta_info: { simulation_mode: true, mission_type: 'Autonomous Grid Resurvey' },
      });
      setActiveSession(newSession);

      // 2. Synthetic Camera photo with EXIF
      const photoPayload = new Blob(['DEMO_RGB_CAMERA_EXIF_IMAGE_BYTES'], { type: 'image/jpeg' });
      const photoFile = new File([photoPayload], `DEMO_NADIR_SHOT_${Date.now().toString().slice(-4)}.JPG`, {
        type: 'image/jpeg',
      });
      const photoData = new FormData();
      photoData.append('file', photoFile);
      photoData.append('session_id', newSession.session_id);
      photoData.append('sensor_id', 'SENSOR-RGB-SONY-01');
      photoData.append(
        'metadata',
        JSON.stringify({
          latitude: 24.5858 + (Math.random() - 0.5) * 0.002,
          longitude: 73.7132 + (Math.random() - 0.5) * 0.002,
          altitude: 512.4,
          rtk_fix_status: 'FIXED_RTK',
        })
      );
      await api.uploadSurveyFile(selectedSurveyId, photoData);

      // 3. Synthetic LiDAR LAS File
      const lidarPayload = new Blob(['DEMO_LIDAR_POINT_CLOUD_BYTES_LASF'], { type: 'application/octet-stream' });
      const lidarFile = new File([lidarPayload], `DEMO_LIVOX_STRIP_${Date.now().toString().slice(-4)}.LAZ`, {
        type: 'application/octet-stream',
      });
      const lidarData = new FormData();
      lidarData.append('file', lidarFile);
      lidarData.append('session_id', newSession.session_id);
      lidarData.append('sensor_id', 'SENSOR-LIDAR-LIVOX-01');
      await api.uploadSurveyFile(selectedSurveyId, lidarData);

      // 4. Synthetic RTK Positioning Log
      const rtkPayload = new Blob(
        [
          '$GNGGA,101530.00,2435.148,N,07342.792,E,4,18,0.9,510.4,M,0.0,M,,*47\n$GNGGA,101532.00,2435.152,N,07342.798,E,4,19,0.8,510.5,M,0.0,M,,*48',
        ],
        { type: 'text/plain' }
      );
      const rtkFile = new File([rtkPayload], `DEMO_RTK_TRAJECTORY_${Date.now().toString().slice(-4)}.NMEA`, {
        type: 'text/plain',
      });
      const rtkData = new FormData();
      rtkData.append('file', rtkFile);
      rtkData.append('session_id', newSession.session_id);
      rtkData.append('sensor_id', 'SENSOR-RTK-UBLOX-01');
      await api.uploadSurveyFile(selectedSurveyId, rtkData);

      setStatusMessage('Simulation Batch Complete: Camera, LiDAR, and RTK telemetry ingested & queued!');
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleRetry = async (fileId: string) => {
    try {
      await api.retryUploadedFile(fileId);
      setStatusMessage(`File ${fileId} requeued for validation and processing.`);
      await loadData();
    } catch (err: any) {
      alert('Retry error: ' + err.message);
    }
  };

  const cameraFilesCount = files.filter((f) => ['JPEG', 'JPG', 'PNG', 'TIF'].includes(f.file_format)).length;
  const lidarFilesCount = files.filter((f) => ['LAS', 'LAZ', 'PLY', 'PCD'].includes(f.file_format)).length;
  const rtkFilesCount = files.filter((f) => ['RINEX', 'RNX', 'NMEA', 'CSV', 'JSON'].includes(f.file_format)).length;
  const totalSizeBytes = files.reduce((acc, f) => acc + f.file_size_bytes, 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2>Drone Data Ingestion & Cloud Pipeline</h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Continuous streaming and batched sensor uploads from ESP32 Mobile Gateway and future onboard Companion Computers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadData} className="btn btn-secondary btn-sm">
            <RotateCw size={14} /> Refresh Stream
          </button>
          <span className="badge badge-emerald">
            <Radio size={12} /> GATEWAY CONNECTED
          </span>
        </div>
      </div>

      {/* Live Upload Session HUD */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(180deg, #132433 0%, #0d1520 100%)',
          borderColor: 'var(--accent-cyan)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span className="font-mono" style={{ fontSize: '0.9rem', color: 'var(--text-cyan)', fontWeight: 700 }}>
                {activeSession?.session_id || 'SESSION-2026-001-A1'}
              </span>
              <span className="badge badge-emerald">{activeSession?.status || 'UPLOADING'}</span>
              <span className="badge badge-slate font-mono" style={{ fontSize: '0.7rem' }}>
                Device: {activeSession?.device_id || 'ESP32-HARIPURA-PROTO-01'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Survey Mission: <strong>{selectedSurveyId}</strong> (Haripura Agricultural Resurvey) | Gateway:{' '}
              <strong>{activeSession?.gateway_type || 'ESP32_PHONE'}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-emerald)' }}>
              {totalSizeMB} MB
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Ingested Volume</div>
          </div>
        </div>

        {/* HUD Statistics Cards */}
        <div className="grid-4" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Camera size={14} style={{ color: 'var(--text-emerald)' }} /> CAMERA PHOTOS
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>{cameraFilesCount}</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Layers size={14} style={{ color: 'var(--text-purple)' }} /> LIDAR POINT CLOUDS
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>{lidarFilesCount}</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Radio size={14} style={{ color: 'var(--text-cyan)' }} /> RTK / GNSS LOGS
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>{rtkFilesCount}</div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Cpu size={14} style={{ color: 'var(--text-amber)' }} /> PROCESSING QUEUE
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-amber)' }}>
              {jobs.filter((j) => j.status === 'QUEUED' || j.status === 'PROCESSING').length} Active
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
            <span>Continuous Ingestion Stream Progress</span>
            <span>100% Ingested & Validated</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #059669 0%, #06b6d4 100%)',
              }}
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            backgroundColor: 'rgba(5, 150, 105, 0.15)',
            borderColor: 'var(--accent-emerald)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Sparkles size={16} style={{ color: 'var(--text-emerald)' }} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Ingestion Navigation Tabs */}
      <div className="tabs-nav">
        <button
          onClick={() => setActiveTab('upload')}
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
        >
          <UploadCloud size={16} /> Upload Station & Dropzone
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
        >
          <Zap size={16} /> Demo Simulator Mode
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
        >
          <FileCheck2 size={16} /> Ingested Files & EXIF ({files.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
        >
          <Cpu size={16} /> Processing Queue ({jobs.length})
        </button>
      </div>

      {/* TAB 1: UPLOAD DROPZONE */}
      {activeTab === 'upload' && (
        <div className="grid-3" style={{ gap: '1.5rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <div
              className="card"
              style={{
                border: '2px dashed var(--border-subtle)',
                textAlign: 'center',
                padding: '3rem 2rem',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('drone-file-input')?.click()}
            >
              <UploadCloud size={48} style={{ color: 'var(--text-emerald)', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
                Select Drone Sensor Files to Continuous Ingest
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                Supports Camera Nadir Images (JPEG, PNG, TIFF), 3D LiDAR (LAS, LAZ, PLY, PCD), and GNSS RTK Trajectory logs (RINEX, NMEA, CSV).
              </p>

              <input
                id="drone-file-input"
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".jpg,.jpeg,.png,.tif,.tiff,.las,.laz,.ply,.pcd,.rinex,.rnx,.nmea,.json,.csv"
              />

              <button disabled={uploading} className="btn btn-primary">
                {uploading ? 'Ingesting Stream...' : 'Browse & Ingest Sensor Files'}
              </button>
            </div>
          </div>

          {/* Sensor Configuration */}
          <div>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                  <HardDrive size={16} style={{ color: 'var(--text-cyan)' }} />
                  Target Sensor Payload
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {sensors.map((s) => (
                  <div
                    key={s.sensor_id}
                    onClick={() => setSelectedSensorId(s.sensor_id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      borderColor: selectedSensorId === s.sensor_id ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                      backgroundColor: selectedSensorId === s.sensor_id ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{s.name}</span>
                      <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>
                        {s.sensor_type}
                      </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {s.sensor_id} | {s.model}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEMO SIMULATION MODE */}
      {activeTab === 'demo' && (
        <div className="card" style={{ background: 'linear-gradient(180deg, #162433 0%, #111a24 100%)' }}>
          <div className="card-header">
            <div>
              <span className="badge badge-purple" style={{ marginBottom: '0.4rem' }}>
                HACKATHON / JURY PRESENTATION MODE
              </span>
              <h3 style={{ fontSize: '1.2rem' }}>Simulated Drone Flight & Sensor Ingestion Pipeline</h3>
            </div>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Simulate the complete hardware chain (<strong>Sensors &rarr; ESP32 &rarr; Mobile Phone App &rarr; HTTPS Cloud Ingestion</strong>)
            with synthetic multispectral camera shots, Livox LiDAR point clouds, and RTK GNSS observations without physical drone hardware.
          </p>

          <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Camera size={16} style={{ color: 'var(--text-emerald)' }} /> 1. Camera Photo Ingestion
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Uploads high-resolution nadir photos and triggers server-side EXIF GPS parsing.
              </p>
            </div>

            <div className="card" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={16} style={{ color: 'var(--text-purple)' }} /> 2. LiDAR Header Extraction
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Parses LAS/LAZ point counts, 3D bounding box coordinates, and elevation spans.
              </p>
            </div>

            <div className="card" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Radio size={16} style={{ color: 'var(--text-cyan)' }} /> 3. RTK Trajectory Sync
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Streams NMEA/RINEX positioning epochs with centimeter-grade fix precision.
              </p>
            </div>
          </div>

          <button
            onClick={runSimulatedFlightBatch}
            disabled={simulating}
            className="btn btn-primary"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}
          >
            <Play size={16} /> {simulating ? 'Executing Simulated Flight Stream...' : 'Trigger Full Drone Ingestion Batch Simulation'}
          </button>
        </div>
      )}

      {/* TAB 3: INGESTED FILES EXPLORER */}
      {activeTab === 'files' && (
        <div className="grid-3" style={{ gap: '1.5rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File ID</th>
                    <th>Filename</th>
                    <th>Format</th>
                    <th>Size</th>
                    <th>RTK Status</th>
                    <th>Lifecycle</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFileForInspect(f)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedFileForInspect?.file_id === f.file_id ? 'rgba(5, 150, 105, 0.1)' : undefined,
                      }}
                    >
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-emerald)', fontSize: '0.8rem' }}>
                        {f.file_id}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{f.filename}</td>
                      <td>
                        <span className="badge badge-slate" style={{ fontSize: '0.65rem' }}>
                          {f.file_format}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{(f.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                      <td>
                        <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                          {f.rtk_fix_status || 'NO_FIX'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            f.upload_status === 'QUEUED' || f.upload_status === 'VALIDATED'
                              ? 'badge-emerald'
                              : f.upload_status === 'FAILED'
                              ? 'badge-amber'
                              : 'badge-purple'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {f.upload_status}
                        </span>
                      </td>
                      <td>
                        {f.upload_status === 'FAILED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(f.file_id);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                          >
                            <RotateCw size={10} /> Retry
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected File Metadata Inspector */}
          <div>
            {selectedFileForInspect ? (
              <div className="card">
                <div className="card-header">
                  <div>
                    <span className="badge badge-emerald" style={{ marginBottom: '0.3rem' }}>
                      {selectedFileForInspect.file_format} METADATA
                    </span>
                    <h3 style={{ fontSize: '1.05rem' }}>{selectedFileForInspect.filename}</h3>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                  <div>
                    <strong>SHA-256 Checksum:</strong>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-emerald)', wordBreak: 'break-all' }}>
                      {selectedFileForInspect.checksum_sha256}
                    </div>
                  </div>

                  <div>
                    <strong>Storage Pointer:</strong>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                      {selectedFileForInspect.storage_key}
                    </div>
                  </div>

                  {selectedFileForInspect.latitude && selectedFileForInspect.longitude && (
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-cyan)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        Georeferenced Coordinates:
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.75rem' }}>
                        {selectedFileForInspect.latitude.toFixed(6)}° N, {selectedFileForInspect.longitude.toFixed(6)}° E
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Altitude: {selectedFileForInspect.altitude?.toFixed(1) || '0.0'} m
                      </div>
                    </div>
                  )}

                  {/* Extracted JSON Block */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Extracted Sensor Parameters
                    </div>
                    <pre
                      className="font-mono"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        color: 'var(--text-emerald)',
                        overflowX: 'auto',
                        maxHeight: '260px',
                      }}
                    >
                      {JSON.stringify(
                        {
                          ...selectedFileForInspect.exif_metadata_json,
                          ...selectedFileForInspect.lidar_metadata_json,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                Select a file from the table to inspect extracted EXIF or LiDAR point cloud headers.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROCESSING QUEUE */}
      {activeTab === 'jobs' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Cpu size={18} style={{ color: 'var(--text-amber)' }} />
              Modular Processing Job Queue
            </h3>
            <span className="badge badge-amber">{jobs.length} Registered Jobs</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Job Pipeline</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Parameters</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-cyan)' }}>
                      {j.job_id}
                    </td>
                    <td>
                      <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                        {j.job_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          j.status === 'COMPLETED' ? 'badge-emerald' : j.status === 'QUEUED' ? 'badge-amber' : 'badge-slate'
                        }`}
                      >
                        {j.status === 'COMPLETED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {j.status}
                      </span>
                    </td>
                    <td>{j.progress_percentage}%</td>
                    <td className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {JSON.stringify(j.parameters_json)}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {j.created_at ? new Date(j.created_at).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
