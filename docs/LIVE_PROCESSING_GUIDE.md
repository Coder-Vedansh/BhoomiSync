# BhoomiSync Live Processing & Drone Simulator Guide

## 1. 11-Stage Automated Downstream Processing

When a drone flight mission completes, the BhoomiSync processing orchestrator advances through 11 sequential processing stages:

| Stage # | Stage Name | Output Asset |
|:---|:---|:---|
| 1 | Raw Sensor Integrity & Checksum | SHA-256 Audit Log |
| 2 | RTK/GNSS Trajectory Georeferencing | WGS84 / UTM 43N Positional Fix |
| 3 | SfM Photogrammetry Alignment | Camera Extrinsics & Sparse Point Cloud |
| 4 | Dense Point Cloud & LiDAR Fusion | Classified LAS Point Cloud |
| 5 | Orthomosaic Map Raster Generation | GeoTIFF Orthophoto (1.2 cm/px) |
| 6 | Digital Elevation (DEM/DSM) Surface Mesh | DEM/DSM GeoTIFF |
| 7 | Accurate 3D Geodesic Area Measurement | 3D Triangulated Mesh Surface Areas |
| 8 | AI Land-Use & Land-Cover (LULC) | Semantic Land-Cover Mask |
| 9 | AI Boundary Extraction | Candidate GeoJSON Boundaries |
| 10 | Cadastral Alignment & Encroachment | Encroachment Risk Heatmap |
| 11 | Digital Survey Report & 5-Format Export | Publication Dossier (PDF, GeoJSON, KML, CSV, JSON) |

---

## 2. Drone Simulator Operations

The flight simulator mimics physical drone hardware streaming telemetry and uploading synthetic RGB frames and LiDAR LAS point clouds.

### Controls:
- **Start Simulator**: `POST /api/v1/drone/simulator/start`
- **Stop Simulator**: `POST /api/v1/drone/simulator/stop`
- **Check Status**: `GET /api/v1/drone/simulator/status`
