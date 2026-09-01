# BhoomiSync Geospatial Processing, Multi-Sensor Fusion & Accurate 2D Map Generation

## Architectural Overview

BhoomiSync provides an end-to-end, hardware-agnostic geospatial processing engine that transforms raw multi-sensor drone data (RGB imagery, 3D LiDAR point clouds, RTK/GNSS geodetic trajectories, and IMU attitudes) into georeferenced 2D cadastral maps and terrain elevation models.

```
RAW DRONE DATA (Camera, LiDAR, RTK/GNSS, IMU)
         │
         ▼
[ Stage 1: Data Ingestion & Validation ] (Checksum, Format, Sensor Health)
         │
         ▼
[ Stage 2: Temporal Synchronization ] (GPS Time ↔ UTC, Epoch Clamping)
         │
         ▼
[ Stage 3: RTK GNSS Georeferencing ] (Fixed 1.2cm, Float 25cm, Transverse Mercator WGS84 ↔ UTM 43N)
         │
         ▼
[ Stage 4: Camera Image Processing & Footprint ] (GSD 2.5cm/px, Perspective Centers, Ray Tracing)
         │
         ▼
[ Stage 5: 3D LiDAR Processing ] (Statistical Outlier Filter, CSF Ground Extraction, Elevation Span)
         │
         ▼
[ Stage 6: Multi-Sensor Spatial Alignment & Fusion ] (Bilinear Interpolation, RGB + Z Fusion)
         │
         ▼
[ Stage 7: True-Scale 2D Orthomosaic Generation ] (Multiband Spline Seamline Blending, GSD=0.025m)
         │
         ▼
[ Stage 8: DEM & DSM Generation ] (Bare-Earth DEM 0.5m, Canopy Height DSM, EGM96 Geoid)
         │
         ▼
[ Stage 9: Terrain-Aware Slope Analysis ] (Gradient Vectors, Mean Slope, Roughness)
         │
         ▼
[ Stage 10: Automatic Cadastral Boundary Detection ] (LIDAR Elevation Ridges, Crop Texture Gradients)
         │
         ▼
[ Stage 11: Geodesic Measurement & Scale Invariance ] (Chamberlain-Duquette Planar Area & 3D Surface Area)
```

---

## Key Geospatial Formulas & Scale Invariance

### 1. Geographic Scale Invariance
All physical dimensions (lengths, perimeters, planar areas, surface areas) are strictly computed from geodesic coordinates on the **WGS84 Reference Ellipsoid** (EPSG:4326) or projected **UTM Zone 43N** (EPSG:32643).
Zooming the UI map or switching display units ($m^2$, hectares, acres, $ft^2$) never modifies the underlying real-world ground truth:
$$\text{Scale Invariance Constraint: } 1\text{m on the ground} = 1.000\text{m in real world}$$

### 2. Geodesic Planar Area (Chamberlain-Duquette Spherical Excess)
Horizontal planar area is calculated by computing spherical polygon excess over WGS84:
$$A_{\text{planar}} = R^2 \left| \sum_{i=1}^{n} (\lambda_{i+1} - \lambda_{i-1}) \cdot \sin(\phi_i) \right|$$
where $\phi_i$ is latitude in radians, $\lambda_i$ is longitude in radians, and $R \approx 6,378,137\text{ m}$.

### 3. Terrain-Aware 3D Surface Area
Agricultural land contains slopes, terraces, and bund embankments. Horizontal projected planar area under-represents actual crop acreage. BhoomiSync computes true 3D surface area from the bare-earth DEM slope angle $\theta$:
$$A_{\text{surface}} = \frac{A_{\text{planar}}}{\cos(\theta_{\text{mean}})}$$
where $\theta_{\text{mean}}$ is the mean terrain slope angle in radians derived from the DEM grid.

---

## 12-Layer GIS Map Architecture

The interactive Leaflet GIS Workbench exposes 12 distinct spatial layers with independent visibility toggles:

| # | Layer Name | Geometry / Type | Description |
|---|---|---|---|
| 1 | **Base Satellite / OSM** | Raster Tiles | Esri World Imagery & OpenStreetMap base |
| 2 | **Raw Camera Capture Points** | Vector Points | Camera exposure centers with EXIF altitude & yaw |
| 3 | **RTK Flight Trajectory Track** | Vector Polyline | Millimeter-accurate GNSS flight track |
| 4 | **2D Orthomosaic Raster** | Georeferenced Raster | 2.5 cm/pixel resolution true-scale ortho |
| 5 | **3D LiDAR Point Cloud** | Vector Bounds / LAS | Ground vs canopy classified point footprint |
| 6 | **Bare-Earth DEM** | Elevation Heatmap | 50 cm resolution terrain elevation raster |
| 7 | **Digital Surface Model (DSM)** | Elevation Heatmap | Total surface with trees and structures |
| 8 | **Field Parcels** | Vector Polygons | Official cadastral boundaries with area metrics |
| 9 | **Detected Bund Boundaries** | Vector Polygons | AI candidate boundaries with confidence scores |
| 10 | **Manually Edited Boundaries** | Vector Polygons | Surveyor-adjusted vertices with audit trails |
| 11 | **Land Use Classification** | Vector Polygons | Crop, fallow, water, settlement zoning |
| 12 | **Historical 1998 Cadastre** | Vector Polygons | Legacy baseline for encroachment analysis |

---

## API Reference (Canonical `/api/v1`)

- `POST /api/v1/surveys/{survey_id}/processing/start`: Triggers 11-stage geospatial processing pipeline.
- `GET /api/v1/surveys/{survey_id}/processing/status`: Returns per-stage completion status and progress.
- `GET /api/v1/surveys/{survey_id}/processing/jobs`: Returns database `ProcessingJob` records.
- `GET /api/v1/surveys/{survey_id}/orthomosaic`: Returns orthomosaic dimensions, GSD, bounding box, and CRS.
- `GET /api/v1/surveys/{survey_id}/dem`: Returns DEM elevation range, slope analysis, and color-ramp.
- `GET /api/v1/surveys/{survey_id}/dsm`: Returns DSM canopy surface model.
- `GET /api/v1/surveys/{survey_id}/point-cloud`: Returns CSF point classification and density metrics.
- `GET /api/v1/surveys/{survey_id}/spatial-layers`: Returns 12-layer GIS architecture manifest.
- `GET /api/v1/surveys/{survey_id}/boundaries`: Returns candidate bund boundaries.
- `GET /api/v1/parcels/{parcel_id}/measurements`: Returns multi-unit planar vs 3D surface area metrics.
- `POST /api/v1/surveys/{survey_id}/parcels`: Creates a new parcel from GIS drawing.
- `PUT /api/v1/parcels/{parcel_id}`: Updates vertices and recalculates surface area with audit log.
- `DELETE /api/v1/parcels/{parcel_id}`: Removes parcel.
