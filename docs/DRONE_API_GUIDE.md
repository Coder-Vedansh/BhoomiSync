# BhoomiSync Drone Ingestion REST & WebSocket API Guide

## 1. REST Endpoints

### 1.1. Create Flight Mission
- **Endpoint**: `POST /api/v1/drone/missions`
- **Request Body**:
```json
{
  "drone_id": "DRONE-001",
  "mission_name": "Haripura Primary Survey",
  "survey_id": "SUR-2026-001"
}
```
- **Response**: Returns initialized mission with 11 queued stages.

### 1.2. Request Presigned Upload URL
- **Endpoint**: `POST /api/v1/drone/upload-url`
- **Request Body**:
```json
{
  "mission_id": "MIS-20260901-A1B2C3",
  "sensor_type": "RGB",
  "filename": "frame_000001.jpg",
  "content_type": "image/jpeg"
}
```
- **Response**: Returns presigned S3 PUT URL and destination object key.

### 1.3. Complete Upload
- **Endpoint**: `POST /api/v1/drone/upload-complete`
- **Request Body**:
```json
{
  "mission_id": "MIS-20260901-A1B2C3",
  "object_key": "surveys/SUR-2026-001/missions/MIS-20260901-A1B2C3/raw/rgb/frame_000001.jpg",
  "sensor_type": "RGB",
  "size_bytes": 6291456,
  "sha256": "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
  "sequence_number": 1
}
```

### 1.4. Ingest Telemetry
- **Endpoint**: `POST /api/v1/drone/telemetry`
- **Request Body**:
```json
{
  "mission_id": "MIS-20260901-A1B2C3",
  "latitude": 24.5853,
  "longitude": 73.7132,
  "altitude": 120.0,
  "heading": 90.0,
  "speed": 9.2,
  "battery_percent": 95.0,
  "rtk_status": "FIXED_RTK",
  "satellites": 18,
  "sequence_number": 1
}
```

---

## 2. WebSocket Real-Time Stream

- **URL**: `ws://localhost:8000/ws/missions/{mission_id}`
- **Broadcast Events**: `TELEMETRY`, `UPLOAD_EVENT`, `MISSION_STATUS`, `STAGE_PROGRESS`.
