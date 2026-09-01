# BhoomiSync — Unified Cadastral Workstation Architecture

## 1. System Overview

BhoomiSync is an enterprise, high-precision cadastral surveying, land resurvey, and digital revenue cadastre platform. It bridges physical drone flight operations (RGB photogrammetry, Livox LiDAR, u-blox RTK/GNSS, IMU telemetry via cellular 4G/5G) with cloud processing (Cloudflare R2 S3 storage, PostGIS spatial databases, AI land classification, 3D geodesic surface area calculations, and publication-ready legal dossiers).

---

## 2. Target 4-Workspace Consolidation

Rather than fragmenting operations across independent demo pages, BhoomiSync consolidates the entire surveyor and revenue official workflow into **4 primary integrated workspaces**:

```
                                 BHOOMISYNC CADASTRAL WORKSTATION
                                                │
     ┌──────────────────────────┬───────────────┴───────────────┬──────────────────────────┐
     ▼                          ▼                               ▼                          ▼
1. DASHBOARD           2. CADASTRAL GIS WORKBENCH      3. LAND REGISTRY           4. REPORTS & EXPORTS
 • Survey Acreage Stats • Central 2D Leaflet Map        • Khasra & Title Search    • Form 1-A PDF Dossiers
 • Live Drone 5G Feed   • 24-Layer Spatial Stack        • 4-Way Area Matrix        • Multi-Format Exports
 • Cloud R2 Stream      • AI Segmentation & Bunds       • Encroachment Screening     (PDF, GeoJSON, KML,
 • AI Processing Queue  • Live RTK Telemetry Strip      • Side Parcel Details        CSV, JSON)
 • Land Discrepancy Feed• Manual Vertex Geometry Edit     Drawer & Verify          • Surveyor Digital Sign-Off
```

---

## 3. Real Data Ingestion & Processing Architecture

```
[ PHYSICAL SENSORS ]
  │ • Sony Alpha RGB Camera (42 MP)
  │ • Livox AVIA LiDAR (240k pts/sec)
  │ • u-blox ZED-F9P RTK GNSS (1.4 cm carrier fix)
  │ • High-rate 6-DOF IMU
  ▼
[ ESP32 FLIGHT COMPUTER & 4G/5G CELLULAR ]
  │ • Hardware optoisolator synchronization
  │ • Ring buffer telemetry cache
  │ • Quectel 5G cellular modem
  ▼
[ BHOOMISYNC INGESTION API (/api/v1/drone-mission/ingest/*) ]
  │ • Cryptographic SHA-256 payload integrity verification
  │ • Zero-egress Cloudflare R2 object storage direct presigned upload
  ▼
[ 11-STAGE GEOSPATIAL & AI FUSION PIPELINE ]
  │ 1. Telemetry ingest & RTK carrier phase reconciliation
  │ 2. EXIF coordinate & camera pose extraction
  │ 3. Photogrammetry Structure-from-Motion (SfM)
  │ 4. Orthomosaic raster generation (1.2 cm/px GSD)
  │ 5. Bare-earth Digital Elevation Model (DEM) & DSM
  │ 6. LiDAR point cloud classification & ground filtering
  │ 7. 8-Class LULC AI segmentation (DeepLabV3+)
  │ 8. Sub-centimeter bund boundary vectorization (SAM + ResNet)
  │ 9. Historical Siamese-CNN baseline change detection
  │ 10. 3D geodesic slope-adjusted surface area calculation
  │ 11. PostGIS spatial indexing & cadastral Khasra alignment
  ▼
[ UNIFIED 4-WORKSPACE USER INTERFACE ]
```

---

## 4. Route Consolidation & Backward Compatibility

All previous routes seamlessly alias into the 4 unified workspaces:

| Legacy Route | Unified Workspace Target | Purpose |
| :--- | :--- | :--- |
| `/` or `/dashboard` | `DashboardPage` | Executive survey statistics & hardware feed |
| `/drone-mission` | `CadastralGisWorkbenchPage` | Live drone stream & flight trajectory |
| `/gis-workbench` | `CadastralGisWorkbenchPage` | 24-layer GIS map & spatial analysis |
| `/geospatial` | `CadastralGisWorkbenchPage` | Photogrammetry, DEM & 3D measurements |
| `/ai-modules` | `CadastralGisWorkbenchPage` | AI LULC & boundary extraction |
| `/datasets` | `CadastralGisWorkbenchPage` | Raw sensor datasets & R2 assets |
| `/land-records` | `UnifiedLandRegistryPage` | Khasra registry search & table |
| `/parcel-detail` | `UnifiedLandRegistryPage` | Parcel ownership & comparison drawer |
| `/comparison` | `UnifiedLandRegistryPage` | 4-way area matrix & encroachment alerts |
| `/reports` | `ReportsPage` | Authoritative dossiers & 1-click downloads |
| `/report-detail` | `ReportDetailPage` | 3-column dossier detail & approval workflow |
| `/security-admin` | `SecurityAdminPage` | System administration & RBAC tokens |
