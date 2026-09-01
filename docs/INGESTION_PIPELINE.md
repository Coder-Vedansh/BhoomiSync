# BhoomiSync Drone Data Ingestion & Cloud Pipeline (Prompt 2 Specification)

> **IMPORTANT SCOPE RESTRICTION**:  
> Drone flight control (MAVLink, ArduPilot, PX4, waypoint navigation, autonomous control) is strictly excluded.  
> BhoomiSync is exclusively a **Data Ingestion, Cloud Storage, Metadata Extraction, and GIS Cadastral Platform**.

---

## 1. Architectural Philosophy & Decoupling

BhoomiSync implements a hardware-agnostic ingestion architecture:
- **Current Prototype**: Sensor data &rarr; ESP32 MCU &rarr; Surveyor Mobile Phone App &rarr; Cellular HTTPS &rarr; BhoomiSync Ingestion API.
- **Future Drone Hardware**: Sensor data &rarr; Onboard Companion Computer (Jetson / ARM) &rarr; Direct 4G/5G/Wi-Fi &rarr; BhoomiSync Ingestion API.

Because the ingestion pipeline operates on standardized multipart sensor payloads with SHA-256 cryptographic checksumming, transitioning from the ESP32 prototype to onboard computers requires zero backend modifications.

---

## 2. Ingestion Lifecycles & State Machines

### A. Upload Session State Machine (`UploadSession`)
```
[CREATED] ──(First file transfer)──> [UPLOADING] ──(All files verified)──> [COMPLETED]
                                         │
                                         └──(Some files failed)──> [PARTIAL]
                                         │
                                         └──(Critical network abort)──> [FAILED]
```

### B. File Lifecycle State Machine (`UploadedFile`)
```
[PENDING] ──> [UPLOADING] ──> [UPLOADED] ──> [VALIDATED] ──> [QUEUED] ──> [PROCESSING] ──> [PROCESSED]
                                   │                              │
                                   └───────(Invalid / Format)─────┴───────(Execution Error)──> [FAILED]
                                                                                                  │
                                                                                             [RETRY API]
```

---

## 3. Supported Sensor Data Types & Metadata Extractors

| Sensor Payload | Formats Supported | Extracted Spatial Metadata | Downstream Processing Job |
|---|---|---|---|
| **High-Resolution Camera** | JPEG, PNG, TIFF, DNG | GPS Lat/Lon/Alt, EXIF timestamp, Camera Make/Model, Focal length, Shutter, ISO | `IMAGE_PREPROCESSING` |
| **3D LiDAR Point Cloud** | LAS, LAZ, PLY, PCD, CSV | Point count, 3D Bounding Box ($[X_{min}, Y_{min}, Z_{min}, X_{max}, Y_{max}, Z_{max}]$), CRS | `LIDAR_PREPROCESSING` |
| **RTK / GNSS Positioning** | RINEX, NMEA ($GNGGA), JSON, CSV | Fixed/Float RTK fix status, Horizontal/Vertical accuracy (cm), Satellite count, Trajectory stream | `GEOREFERENCING` |

---

## 4. API Endpoints (`/api/v1/`)

- `POST /api/v1/surveys/{survey_id}/upload-sessions` — Initialize continuous upload session.
- `GET /api/v1/surveys/{survey_id}/upload-sessions` — List all sessions for a survey.
- `GET /api/v1/upload-sessions/{session_id}` — Session status, transfer progress, byte counts.
- `POST /api/v1/upload-sessions/{session_id}/complete` — Finalize session.
- `POST /api/v1/surveys/{survey_id}/upload` — Continuous multipart sensor file upload with deduplication.
- `GET /api/v1/files/{file_id}` — Inspect uploaded file metadata, EXIF, and storage keys.
- `GET /api/v1/surveys/{survey_id}/files` — List all ingested files.
- `POST /api/v1/files/{file_id}/retry` — Re-trigger validation / requeue processing job.
- `GET /api/v1/surveys/{survey_id}/spatial-footprint` — GeoJSON camera points, LiDAR bounds, and RTK tracks.
- `GET /api/v1/processing/jobs` — Modular processing queue monitor.
- `GET /api/v1/sensors` & `POST /api/v1/sensors` — Hardware sensor registry.

---

## 5. Storage Abstraction & Data Integrity
- Large binaries (JPEG/PNG, LAS/LAZ, RINEX) are stored in the `CloudStorageProvider` abstraction (`MockStorageProvider` locally; pluggable AWS S3, GCS, Azure Blob).
- PostgreSQL / PostGIS stores only georeferenced metadata, spatial geometries, checksums, and processing job queues.
- Original files are 100% immutable; metadata extraction operates read-only on raw bytes.
- Duplicate detection matches SHA-256 hashes to prevent redundant storage allocation.
