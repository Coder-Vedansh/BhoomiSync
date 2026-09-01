# BhoomiSync — Unified UI & Design System Guide

## 1. Design System Philosophy

BhoomiSync implements a dark, professional, government-grade geospatial platform design language:
- **Color Palette**: Deep navy / obsidian background (`#020617`, `#0b1118`, `#0f172a`), slate borders (`#1e293b`, `#334155`), vibrant emerald for active/healthy states (`#10b981`), cyan for telemetry/sensor streams (`#06b6d4`), amber for warnings/discrepancies (`#f59e0b`), and purple for administrative capabilities.
- **Typography**: Clean, high-legibility sans-serif with monospace font for coordinates, Khasra numbers, SHA-256 hashes, and area measurements.
- **Micro-Interactions**: Hover glows, active emerald pill highlights, smooth sheet drawer transitions, and responsive mobile drawers.

---

## 2. Component Design Standards

### Central Reusable Components (`src/components/ui/`):
- `PageHeader`: Title, descriptive subtitle, system state badges, and action buttons.
- `StatGrid`: 1/2/3/4 column responsive grid for metric cards.
- `MetricCard`: KPI card with icon, color accent, formatted metric value, and comparison subtitle.
- `Badge` & `StatusBadge`: Semantic color-coded pill indicators (`VERIFIED`, `PENDING`, `DISPUTED`, `LIVE 5G`, `SIMULATION MODE`).
- `DataTable`: Responsive data table with column headers, formatted cells, hover states, and empty states.
- `Tabs`: Clean pill tab bar with count badges.
- `SearchInput` & `Select`: Dark themed form controls with border focus indicators.
- `Modal`: Accessible dialog modal with backdrop blur.

---

## 3. The 4 Primary Workspaces

### Workspace 1: Dashboard (`/dashboard`)
- **Survey Acreage Statistics**: 4-card metric grid (Villages, Total Area in Ha/Acres, Parcels, Datasets in R2).
- **Physical Drone Status**: RTK Carrier fix (1.4 cm), altitude MSL, speed, battery level, mission ID.
- **Cloudflare R2 Storage**: Object count, total volume, upload rate, SHA-256 verification.
- **AI Engines**: 8-Class LULC accuracy, Bund extraction resolution, Siamese-CNN change detection.
- **Land Registry Discrepancy Alerts**: Encroachment warnings and permissible variance alerts.
- **Quick Action Hub**: 1-Click shortcuts to GIS Workbench, Land Registry, and Reports.

### Workspace 2: Cadastral GIS Workbench (`/gis`)
- **Central Dominant Map**: 24-layer Leaflet GIS map with Satellite base, $1.2\text{ cm/px}$ Orthomosaic, DEM mesh, LiDAR footprint, planned flight path, live position vector, AI candidate boundaries, and Khasra polygons.
- **Right Drawer**:
  - *Layer Panel*: Checkboxes for all 24 spatial layers and base map selector.
  - *AI Engine*: Trigger LULC classification, bund boundary extraction, and historical change detection.
  - *Parcel Inspector*: Instant inspector showing Khasra #, Village, Owner (RBAC masked), 2D Planar vs 3D Terrain Area, Area difference in $\text{m}^2$ and $\%$, IoU, Centroid Drift, and `Verify Boundary` action.
- **Bottom Telemetry Strip**: Real-time RTK fix, accuracy, latitude, longitude, altitude, speed, heading, satellites, battery, and simulator controls.
- **Manual Vertex Editing**: Interactive vertex dragging, adding/deleting vertices, live surface area calculation, and cryptographic save.

### Workspace 3: Land Registry (`/land-registry`)
- **Search & Multi-Filter Bar**: Search by Khasra #, Parcel ID, Village, Owner; Filters for Village, Land Use, Status.
- **Registry Table**: Khasra #, Village, Owner (RBAC masked), Official Area, Surveyed Area, Difference ($\Delta$), Land Use, Status, Risk Badge.
- **Side Parcel Details Drawer**: Owner Profile, 4-Way Area Comparison Matrix (Official, Historical, Drone Planar, 3D Geodesic), Net Discrepancy, Encroachment Status, and Actions (`Verify`, `Open in GIS`).
- **Batch Record Import Modal**: PostGIS batch importer for CSV, Excel, or GeoJSON revenue records.

### Workspace 4: Reports & Exports (`/reports`)
- **Archive Table**: Filter by village, survey, date, status, or report type.
- **3-Column Dossier Detail**:
  - *Left*: Metadata, survey ID, village, status, privacy level.
  - *Center*: Executive summary, cadastral map, measurements (2D vs 3D), AI classification, legal info.
  - *Right*: Quality checklist, RTK accuracy, SHA-256 checksum, Surveyor Approval workflow (`Approve`, `Reject`).
- **1-Click Multi-Format Downloads**: PDF Form 1-A, GeoJSON, KML, CSV, and JSON.
