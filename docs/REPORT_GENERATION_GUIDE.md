# BhoomiSync Digital Survey Report Generation User Guide

## 1. Introduction

The BhoomiSync Reporting System enables surveyors, government revenue officials, and administrators to generate high-precision cadastral dossiers with 1-click downloads across 5 standard industry formats.

---

## 2. Report Generation Workflow

```
+------------------------------------------------------------------------------------+
|  Step 1: Select Survey & Parcel Identifier (e.g. Haripura Village, Khasra #101)   |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|  Step 2: Configure Preferences (Unit: m² / Ha / Acres, Report Type, Title)         |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|  Step 3: Select Included Sections (Executive Summary, 2D Map, Sensor Telemetry...)  |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|  Step 4: Automated Pre-Generation Quality Validation (Topology, RTK, CRS Check)    |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|  Step 5: Immutable Snapshot Freeze & Auto-Generation of 5 Export Formats           |
+------------------------------------------------------------------------------------+
```

---

## 3. Review & Approval Lifecycle

Reports transition through a strict state machine:
1. **`DRAFT`**: Initial template with configuration parameters.
2. **`GENERATED`**: Data snapshot captured, SHA-256 computed, 5 export formats generated.
3. **`UNDER_REVIEW`**: Submitted to authorized revenue officer for verification.
4. **`APPROVED`**: Official surveyor digital signature appended. Report is legally locked.
5. **`REJECTED`**: Returned to draft stage with documented rejection rationale.
6. **`ARCHIVED`**: Preserved for historical audit compliance.

---

## 4. Export Formats & Usage

### 4.1. PDF Report (11 Pages)
- Page 1: Official Title & Village Cover Page
- Page 2: Executive Summary & Comparison Metrics
- Page 3: Land Parcel Details & Ownership (PII Masked)
- Page 4: 2D Vector Cadastral Map & Boundary Legend
- Page 5: Geodesic vs. 3D Surface Area Measurement Analysis
- Page 6: Drone Platform & RTK Sensor Precision Calibration
- Page 7: AI Land-Use / Land-Cover (LULC) Classification
- Page 8: Multi-Boundary Spatial Displacement Analysis
- Page 9: Historical Cadastre Temporal Evolution Vault
- Page 10: Potential Encroachment Risk & Anomaly Notice
- Page 11: Surveyor Field Verification & Digital Sign-off

### 4.2. GeoJSON Multi-Layer
Contains 4 distinct boundary features with RFC 7946 compliance:
- `layer: "OFFICIAL_CADASTRAL"`: Revenue village settlement boundary.
- `layer: "HISTORICAL_1998"`: Historical settlement baseline.
- `layer: "DRONE_PHOTOGRAMMETRY"`: High-resolution aerial survey boundary.
- `layer: "SURVEYOR_VERIFIED"`: Ground-truth field validated boundary.
- `layer: "PARCEL_CENTROID"`: Geo-referenced point anchor.

### 4.3. OpenGIS KML
- Styled Google Earth overlay with polygon colors matching BhoomiSync UI.
- Interactive information balloons containing owner name, area, and RTK accuracy.

### 4.4. Tabular CSV
- Detailed vertex coordinates in WGS84 (Lat/Lon) and UTM Easting/Northing with elevation.

### 4.5. JSON Data Envelope
- Machine-readable hierarchical JSON with cryptographic SHA-256 header.
