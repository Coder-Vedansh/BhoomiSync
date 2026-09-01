# BhoomiSync: Rural Agricultural Land Survey, Resurvey & Cadastral Mapping Platform

> **IMPORTANT ARCHITECTURAL NOTICE:**  
> **DRONE FLIGHT CONTROL IS STRICTLY NOT IMPLEMENTED IN THIS SYSTEM.**  
> BhoomiSync contains no MAVLink, ArduPilot, PX4, ROS 2, autonomous waypoint navigation, or flight control systems.  
> BhoomiSync is exclusively a **Data Acquisition + Continuous Ingestion + Cloud Storage + AI Segmentation + GIS Cadastral Platform**.

---

## 1. Project Overview

**BhoomiSync** is a technology-driven rural agricultural land survey, resurvey, mapping, and land-information platform. It receives and continuously ingests multi-sensor data collected from drones (High-Resolution Nadir Cameras, 3D LiDAR, Dual-Frequency RTK/GNSS positioning) and transforms them into accurate, georeferenced 2D cadastral land maps and verifiable agricultural parcel geometries.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph Data Acquisition Gateway
        ESP[Drone Sensors: Camera, LiDAR, RTK] --> ESP32[ESP32 Proto Gateway]
        ESP32 --> Phone[Phone Mobile Relay App]
        Phone --> IngestAPI[BhoomiSync Continuous Ingestion API /api/v1]
        CC[Future Companion Computer] -.-> IngestAPI
    end

    subgraph BhoomiSync Ingestion & Storage Core
        IngestAPI --> Storage[Cloud Storage Abstraction (Mock/S3/GCS)]
        IngestAPI --> Extractors[Metadata Extractors: EXIF, LiDAR LAS/LAZ, RTK/NMEA]
        IngestAPI --> Dedup[SHA-256 Checksum & Duplicate Detector]
        IngestAPI --> DB[(PostgreSQL 16 + PostGIS 3.4)]
        
        DB --> Sessions[Upload Sessions & File Lifecycle State Machine]
        DB --> Jobs[Modular Processing Job Queue]
        DB --> Lineage[Data Lineage & Provenance Engine]
        DB --> Parcels[Cadastral Parcel & Audit System]
    end

    subgraph Frontend Client
        DB --> APILayer[FastAPI Canonical /api/v1 REST Layer]
        APILayer --> Dashboard[BhoomiSync React + TS GIS Dashboard]
        Dashboard --> IngestionStation[Drone Ingestion Station & Demo Mode]
        Dashboard --> LeafletMap[Interactive Spatial GIS Map with Sensor Overlays]
        Dashboard --> LineageVisualizer[Data Lineage Visualizer DAG]
    end
```

---

## 3. Technology Stack

### Backend
- **Language**: Python 3.11+
- **Web Framework**: FastAPI (Asynchronous REST API)
- **Data Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **ORM & Database Client**: SQLAlchemy 2.0+ & psycopg2-binary
- **Geospatial & Spatial Calculations**: PostGIS 3.4, Shapely 2.0+, PyProj 3.7+
- **Metadata Extraction**: Pillow 12.3+ (EXIF), Binary Struct Adapters (LAS/LAZ/PLY/PCD), Regex/NMEA Parsers
- **Testing**: Pytest (27/27 Passing Tests) & HTTPX TestClient

### Frontend
- **Framework & Language**: React 18 / TypeScript 5.7+ / Vite 6.1+
- **GIS Mapping Engine**: Leaflet 1.9+ & React-Leaflet
- **Icons**: Lucide React
- **Styling**: Custom Enterprise Agri-Tech Design System (Responsive Dark/Slate/Emerald theme)

### Infrastructure & Database
- **Database**: PostgreSQL 16 with PostGIS 3.4 Spatial Extensions
- **Containerization**: Docker & Docker Compose
- **Object Storage**: Pluggable `CloudStorageProvider` (Mock/Local Filesystem, S3, GCS, Azure Blob)

---

## 4. Monorepo Folder Structure

```
BhoomiSync/
├── frontend/                     # React + TypeScript + Vite GIS Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── gis/              # Leaflet GIS Map with Photo/LiDAR/RTK Footprint Overlays
│   │   │   ├── layout/           # Header & Sidebar navigation
│   │   │   └── lineage/          # Provenance DAG visualizer
│   │   ├── pages/
│   │   │   ├── DroneIngestionPage.tsx # Continuous Ingestion Station, Dropzone & Demo Mode
│   │   │   ├── DashboardPage.tsx # Operations HUD & quick launch
│   │   │   ├── SurveysPage.tsx, SurveyDetailPage.tsx, DatasetsPage.tsx, GisWorkbenchPage.tsx, etc.
│   │   ├── services/             # Typed API client (api.ts targeting /api/v1)
│   │   ├── types/                # TypeScript interfaces (Ingestion, Sessions, Files, Jobs, Footprint)
│   │   └── index.css             # Custom Agri-Tech Design System
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── api/                  # Canonical /api/v1 and /api router
│   │   ├── core/                 # Config, custom exceptions, standardized response envelopes
│   │   ├── db/                   # Database session, base model, seed data (SUR-2026-001)
│   │   ├── models/               # SQLAlchemy models (Survey, Dataset, Ingestion, Parcel)
│   │   ├── schemas/              # Pydantic v2 schemas (Ingestion, Survey, Dataset, Parcel, AI, GIS)
│   │   └── modules/
│   │       ├── cloud_ingestion/  # Storage & Gateway abstractions, IngestionService, Router, Extractors
│   │       │   ├── extractors/   # image_extractor (EXIF), lidar_extractor (LAS/LAZ), position_extractor
│   │       │   ├── gateway/      # ESP32PhoneGateway, CompanionComputerGateway
│   │       │   ├── storage_provider.py # CloudStorageProvider interface & MockStorageProvider
│   │       │   ├── ingestion_service.py # Core session, upload, dedup, and job queuing logic
│   │       │   └── ingestion_router.py  # Endpoints for sessions, upload, retry, spatial footprint
│   │       ├── surveys/, datasets/, parcels/, gis/, comparison/, ai/
│   ├── requirements.txt
│   └── tests/                    # Pytest test suite (27 unit & integration tests)
│
├── infrastructure/
│   ├── docker/                   # Dockerfiles for backend and frontend
│   └── database/                 # init-postgis.sql (PostGIS initialization DDL)
│
├── docs/                         # Architecture, Ingestion, Data Lineage & API Specifications
├── docker-compose.yml            # Multi-container orchestration (PostGIS, Backend, Frontend)
├── .env.example                  # Environment configuration template
└── README.md
```

---

## 5. How to Run Locally

### 1. Start Backend Server
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI available at: `http://127.0.0.1:8000/docs`

### 2. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Open `http://127.0.0.1:5173/` in your browser.

### 3. Run Automated Tests
```bash
python -m pytest backend/tests -v
```

---

## 6. How to Test Image & LiDAR Uploads & Demo Mode

### A. Manual File Upload Testing
1. In the frontend sidebar, click **"Drone Data Ingestion"**.
2. Under the **"Upload Station & Dropzone"** tab, select a Target Sensor Payload (e.g. `Sony RX0 II Survey Camera` or `Livox Mid-360 LiDAR`).
3. Click **"Browse & Ingest Sensor Files"** and select sample `.jpg` photos, `.laz`/`.las` LiDAR files, or `.nmea`/`.rinex` logs.
4. The system automatically:
   - Computes SHA-256 cryptographic checksum.
   - Rejects duplicates and stores unique binaries in Object Storage.
   - Extracts EXIF/LiDAR metadata and registers a `ProcessingJob`.

### B. Testing Hackathon / Presentation Demo Mode
1. On the **Drone Data Ingestion** page, click the **"Demo Simulator Mode"** tab.
2. Click **"Trigger Full Drone Ingestion Batch Simulation"**.
3. The system will create a simulated session (`ESP32-DEMO-SIMULATOR`), ingest synthetic geotagged camera photos, a Livox LiDAR strip, and RTK GNSS logs.
4. Navigate to **"GIS Map Workbench"** in the sidebar:
   - Green circle markers appear at photo capture coordinates (click for popup preview).
   - A purple dashed polygon outlines the 3D LiDAR bounding box.
   - A cyan trajectory path plots the RTK GNSS flight track.

---

## 7. Database Setup & PostGIS Configuration

- PostGIS 3.4 extensions initialized automatically via `infrastructure/database/init-postgis.sql`.
- In local development, the backend uses SQLite with standard geodesic ellipsoidal math (Chamberlain-Duquette on WGS84).
- Production deployments connect directly to PostgreSQL 16 + PostGIS 3.4 via `docker compose up`.

---

## 8. REST API Overview (`/api/v1/`)

| Method | Endpoint | Functional Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check, DB engine, storage provider, gateway type |
| `GET` | `/api/v1/sensors` | List registered drone sensor payloads |
| `POST` | `/api/v1/sensors` | Register new sensor payload specifications |
| `POST` | `/api/v1/surveys/{id}/upload-sessions` | Initialize continuous upload session |
| `GET` | `/api/v1/surveys/{id}/upload-sessions` | List upload sessions for survey |
| `GET` | `/api/v1/upload-sessions/{id}` | Session transfer progress & statistics |
| `POST` | `/api/v1/upload-sessions/{id}/complete` | Finalize upload session |
| `POST` | `/api/v1/surveys/{id}/upload` | Multipart continuous upload (Camera, LiDAR, RTK) |
| `GET` | `/api/v1/files/{file_id}` | Inspect uploaded file metadata, EXIF, storage key |
| `GET` | `/api/v1/surveys/{id}/files` | List all uploaded sensor files |
| `POST` | `/api/v1/files/{file_id}/retry` | Retry failed file / requeue processing job |
| `GET` | `/api/v1/surveys/{id}/spatial-footprint` | GeoJSON camera points, LiDAR bounds, RTK tracks |
| `GET` | `/api/v1/processing/jobs` | Monitor modular processing job queues |
| `GET` | `/api/v1/surveys` & `POST /api/v1/surveys` | Surveys management |
| `GET` | `/api/v1/surveys/{id}/parcels` | Geodesic cadastral parcel boundaries |
| `GET` | `/api/v1/surveys/{id}/lineage` | Provenance DAG nodes & edges |
| `GET` | `/api/v1/gis/status` | GIS engine status & supported CRS |
| `GET` | `/api/v1/comparison/surveys/{id}` | Historical revenue vs drone resurvey diff |

---

## 9. Current Prototype vs Future Hardware Architecture

- **Current Prototype**:
  `[Drone Sensors] -> [ESP32 Hardware Trigger] -> [Surveyor Mobile Phone] -> [BhoomiSync Cloud API /api/v1]`
- **Future Drone Architecture**:
  `[Drone Sensors] -> [Onboard Companion Computer (Jetson/ARM)] -> [Direct 4G/5G/Wi-Fi] -> [BhoomiSync Cloud API /api/v1]`

---

## 10. Scope Boundaries: Out of Scope for Prompt 2

The following items remain strictly out of scope:
- ❌ Drone flight control, MAVLink, autonomous navigation, takeoff/landing commands.
- ❌ AI land classification algorithms & model training (Prompt 3+).
- ❌ Automatic parcel boundary vectorization & deep learning inference (Prompt 3+).
- ❌ Photogrammetry orthomosaic stitching & dense LiDAR point cloud meshing (Prompt 3+).
- ❌ Final 2D cadastral land map generation (Prompt 3+).
