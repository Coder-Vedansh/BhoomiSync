# BhoomiSync Real-Time Drone Ingestion & Cloud Processing Architecture

## 1. Executive Summary

Prompt 8 implements the high-frequency cellular 4G/5G ingestion bridge connecting aerial survey drones (e.g. DJI Matrice 350 RTK / custom ESP32 flight computers) directly to Cloudflare R2 object storage and BhoomiSync's downstream processing services.

---

## 2. High-Level Data Flow

```
+-------------------------------------------------------------------------+
| DRONE SENSORS (Sony 61MP RGB, Hesai LiDAR, u-blox RTK GNSS, 6-DoF IMU) |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| ESP32 / FLIGHT COMPANION COMPUTER (Cellular 4G/5G SA Modems)            |
+-------------------------------------------------------------------------+
           |                                              |
           | 1. Request Presigned URL                     | 3. High-Frequency Telemetry
           v                                              v
+-----------------------------+           +-----------------------------+
| BHOOMISYNC INGESTION API    |           | TELEMETRY INGESTION STREAM  |
+-----------------------------+           +-----------------------------+
           |                                              |
           | 2. Presigned PUT URL                         v
           v                               +-----------------------------+
+-----------------------------+            | WEBSOCKET BROADCAST MANAGER |
| CLOUDFLARE R2 OBJECT BUCKET |            +-----------------------------+
| (bhoomisync-drone-data)     |                           |
|  - raw/rgb/                 |                           v
|  - raw/lidar/               |            +-----------------------------+
|  - raw/gnss/                |            | LIVE FRONTEND GIS DASHBOARD |
|  - manifests/               |            +-----------------------------+
+-----------------------------+
           |
           | 4. Upload Complete Event + SHA-256 Validation
           v
+-------------------------------------------------------------------------+
| 11-STAGE CLOUD PROCESSING ORCHESTRATION PIPELINE                        |
|  Stage 1: Raw Sensor Integrity & Checksum Verification                 |
|  Stage 2: RTK/GNSS Trajectory Georeferencing                           |
|  Stage 3: Structure-from-Motion (SfM) Photogrammetry                   |
|  Stage 4: Dense Point Cloud & LiDAR Fusion                             |
|  Stage 5: Orthomosaic Map Raster Generation                            |
|  Stage 6: Digital Elevation (DEM/DSM) Surface Mesh                     |
|  Stage 7: Accurate 3D Geodesic Area Measurement                        |
|  Stage 8: AI Land-Use & Land-Cover (LULC) Classification               |
|  Stage 9: AI Automated Boundary Intelligence Extraction                |
|  Stage 10: Cadastral Historical Alignment & Encroachment Anomaly       |
|  Stage 11: Digital Survey Report & Multi-Format Export Generation      |
+-------------------------------------------------------------------------+
```

---

## 3. Storage Hierarchy in Cloudflare R2

Deterministic object paths:
```
surveys/
  {survey_id}/
    missions/
      {mission_id}/
        raw/
          rgb/frame_000001.jpg
          lidar/scan_chunk_0001.las
          gnss/gnss_log_0001.json
          imu/imu_batch_0001.json
          telemetry/telemetry_0001.json
        processed/
          orthomosaic/
          dem/
          dsm/
          classifications/
          boundaries/
          change-detection/
        manifests/
          survey_manifest.json
        reports/
```

---

## 4. Idempotency & Cryptographic Verification

1. **Idempotency Key**: `mission_id + sensor_type + sequence_number`.
2. **SHA-256 Content Validation**: Enforces full hexadecimal hash verification on all payloads.
3. **MIME & Extension Whitelist**: Strictly enforces allowed file formats (`.jpg`, `.png`, `.tif`, `.las`, `.laz`, `.ply`, `.json`, `.csv`, `.nmea`).
