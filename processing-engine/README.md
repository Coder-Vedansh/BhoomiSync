# BhoomiSync Photogrammetry & AI Processing Engine 🛰️

Standalone microservice responsible for:
1. **High-Performance Photogrammetry**: Orthomosaic stitching, Bare-Earth DEM extraction, DSM surface models, 3D LiDAR point cloud generation.
2. **AI Cadastral Intelligence**: Agricultural bund line detection, DeepLabV3 LULC classification, multi-temporal Siamese change detection & encroachment alerts.
3. **XYZ Tile Serving**: Serves raster tiles directly into BhoomiSync's Leaflet / MapLibre GIS Workbench.

---

## 🚀 Quickstart (Standalone Local Run)

```bash
cd processing-engine
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Run server on port 9000
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

- **Interactive API Docs (Swagger)**: `http://localhost:9000/docs`
- **Health Check**: `GET http://localhost:9000/api/v1/engine/health`

---

## 🐳 Docker Deployment (with OpenDroneMap NodeODM)

```bash
docker compose up -d
```
This boots both the **FastAPI Engine** and the **OpenDroneMap (NodeODM)** photogrammetry cluster.

---

## 📡 API Contract Specification

All endpoints are prefixed under `/api/v1/engine`.

### 1. Health & Subsystem Status
`GET /api/v1/engine/health`
```json
{
  "status": "HEALTHY",
  "service": "BhoomiSync Photogrammetry & AI Processing Engine",
  "version": "1.0.0",
  "capabilities": {
    "photogrammetry": "OpenDroneMap (ODM)",
    "tile_server": "http://localhost:9000/api/v1/engine/tiles",
    "ai_models": ["Agricultural-Bund-Detection-v2", "LULC-DeepLabV3-Cadastral", "Siamese-Encroachment-Detector"]
  }
}
```

### 2. Submit Photogrammetry Reconstruction Job
`POST /api/v1/engine/photogrammetry/process`
```json
{
  "survey_id": "SUR-2026-001",
  "image_urls": ["s3://bhoomisync-data/drone/img001.jpg"],
  "target_gsd_cm": 1.5,
  "target_dem_res_m": 0.5,
  "generate_dsm": true,
  "generate_point_cloud": true,
  "webhook_url": "http://main-backend:8000/api/v1/geospatial/webhook"
}
```
**Response (202 Accepted)**:
```json
{
  "job_id": "JOB-A8F432B91100",
  "survey_id": "SUR-2026-001",
  "status": "RUNNING",
  "progress_pct": 0,
  "current_stage": "EXIF_EXTRACTION"
}
```

### 3. Poll Job Status
`GET /api/v1/engine/photogrammetry/jobs/{job_id}`
Returns complete processing manifest with orthomosaic GeoTIFF URL, DEM URL, and tile template when `COMPLETED`.

### 4. AI Agricultural Bund Extraction
`POST /api/v1/engine/ai/boundary-detect`
```json
{
  "survey_id": "SUR-2026-001",
  "confidence_threshold": 0.85
}
```
**Response**:
Returns GeoJSON candidate polygons with perimeter, estimated area in $m^2$, and confidence score.

### 5. AI Land Use / Land Cover (LULC) Segmentation
`POST /api/v1/engine/ai/lulc-classify`
**Response**:
Returns breakdown of agricultural acreage, fallow land, water bodies, roads, and built-up structures.

### 6. AI Change Detection & Encroachments
`POST /api/v1/engine/ai/change-detect`
**Response**:
Returns boundary divergence alerts with severity rating (`CRITICAL_ENCROACHMENT`, `SUSPICIOUS_SHIFT`).

### 7. XYZ Map Tile Layer
`GET /api/v1/engine/tiles/{survey_id}/{z}/{x}/{y}.png`
Serves 256x256 image tiles for seamless Leaflet integration.

---

## 🔗 Connecting to BhoomiSync Main Backend

In `BhoomiSync/backend/.env`, configure:
```env
PROCESSING_ENGINE_URL=http://<YOUR_SERVER_IP>:9000/api/v1/engine
PROCESSING_ENGINE_SECRET=bhoomisync-engine-dev-secret
```
When configured, BhoomiSync will automatically delegate heavy photogrammetry and deep learning inference to this server!
