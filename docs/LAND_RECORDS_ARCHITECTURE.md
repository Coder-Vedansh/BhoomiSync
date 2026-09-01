# BhoomiSync Land Records, Ownership & Cadastral Intelligence Architecture

## 1. Executive Overview

The **Land Records, Ownership & Cadastral Intelligence Module** (Prompt 5) connects the physical and geospatial measurements captured by BhoomiSync's centimeter-accurate drone surveys with legal, administrative, and ownership land records (Jamabandi / Khasra / Bhunaksha).

The system addresses the fundamental divergence between historical paper/revenue settlements (e.g. 1998 Rajasthan Revenue Cadastre) and physical ground truth, providing automated 4-way area reconciliation, role-based privacy masking, multi-factor geospatial matching, and surveyor adjudication workflows.

```
+-----------------------------------------------------------------------------------+
|                           BHOOMISYNC CADASTRAL ARCHITECTURE                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Official Cadastre]          [Prompt 3 Drone Survey]      [Historical Records]   |
|   (Apna Khata / Bhunaksha)     (Camera + LiDAR + RTK)       (1998 Settlement)     |
|             \                         |                         /                 |
|              \                        |                        /                  |
|               v                       v                       v                   |
|       +---------------------------------------------------------------+           |
|       |             LAND RECORDS INGESTION & PARSING ENGINE           |           |
|       |    - CSV / JSON / GeoJSON / Mock Importers                    |           |
|       |    - SHA-256 Checksum Hashing & Schema Validation             |           |
|       |    - Duplicate Detection by parcel_id                         |           |
|       +-------------------------------+-------------------------------+           |
|                                       |                                           |
|                                       v                                           |
|       +---------------------------------------------------------------+           |
|       |                 GEOSPATIAL PARCEL MATCHING ENGINE             |           |
|       |   Score = 0.45(IoU) + 0.25(AreaSim) + 0.20(Centroid) + 0.10(No) |        |
|       |   Categories: MATCHED | POSSIBLE_MATCH | NO_MATCH | CONFLICT  |           |
|       +-------------------------------+-------------------------------+           |
|                                       |                                           |
|                                       v                                           |
|       +---------------------------------------------------------------+           |
|       |                 4-WAY PARCEL COMPARISON ENGINE                |           |
|       |   Official Area vs Historical Area vs Drone Area vs Verified  |           |
|       |   Units: m², Hectares, Acres (1 ha = 10,000m², 1 ac = 4046m²) |           |
|       |   Spatial Drift: Displacement (m), Perimeter Δ, Centroid Drift |          |
|       +-------------------------------+-------------------------------+           |
|                                       |                                           |
|                                       v                                           |
|       +---------------------------------------------------------------+           |
|       |                 ROLE-BASED PRIVACY PROJECTION LAYER           |           |
|       |   - PUBLIC: Masked Owner Name (R***** P****), No Private Tel   |          |
|       |   - SURVEYOR: Operational Access, Full Names, Verification    |           |
|       |   - ADMIN: Complete Title Ownership %, Mutation History, Audit |          |
|       +-------------------------------+-------------------------------+           |
|                                       |                                           |
|                                       v                                           |
|       +---------------------------------------------------------------+           |
|       |            24-LAYER GIS WORKBENCH & INTERACTIVE DETAIL        |           |
|       |   - Layers 19-24: Cadastral, Ownership, 1998, Drone, Verified |           |
|       |   - Dedicated Parcel Detail Page (/parcels/:parcelId)         |           |
|       +---------------------------------------------------------------+           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Database Schema Design (PostgreSQL / PostGIS & SQLite)

The cadastral intelligence layer introduces 8 normalized tables with PostGIS `Geometry(Polygon, 4326)` column support and JSON fallback geometry serialization:

1. **`land_parcels`**: Canonical registry of agricultural land parcels (Khasra numbers, village, tehsil, official area, drone-measured area, verified area, land use, and match status).
2. **`land_owners`**: Registered Khatedar / title holders with legal entity types (`INDIVIDUAL`, `JOINT`, `COMMUNITY`, `GOVERNMENT`).
3. **`parcel_ownerships`**: Many-to-many relationship join tracking legal shares (percentage), acquisition dates, and mutation source IDs.
4. **`land_records`**: Provenance records representing source administrative documents (Jamabandi sheets, Khasra Girdawari entries) with SHA-256 integrity checksums.
5. **`cadastral_versions`**: Historical boundary evolution versions (e.g., 1998 Revenue Settlement, 2015 Revision, 2024 Drone Pilot, 2026 Resurvey).
6. **`parcel_change_records`**: AI-detected and surveyor-flagged boundary shifts, unauthorized structures, and potential encroachments.
7. **`parcel_documents`**: Associated binary documents (PDFs, TIFFs, GeoJSON map sheets) with storage path references and size metadata.
8. **`land_record_import_sessions`**: Batch import audit logs recording total, successful, duplicate, and failed record counts.

---

## 3. Privacy-Safe Role-Based Data Projections

Public GIS endpoints must balance transparency with privacy protection. The backend utilizes FastAPI role gating via `X-User-Role` headers:

| Field / Attribute | `PUBLIC` Role | `SURVEYOR` Role | `ADMIN` Role |
| :--- | :--- | :--- | :--- |
| **Owner Name** | Masked (`R***** P****`) | Full Legal Name | Full Legal Name |
| **Owner Reference** | Masked Code (`OWN-HR-001`) | Primary Reference | Primary Reference |
| **Ownership Breakdown** | Hidden | Basic Count | Full Share % & Co-owners |
| **Contact Hash** | Omitted (`null`) | Masked Hash Reference | Available |
| **Boundary Geometry** | Available | Available (Editable) | Available (All Versions) |
| **Area Metrics** | Standard Units ($m^2$, ha) | $m^2$, ha, acres, diff % | Complete Audit Breakdown |
| **Surveyor Verification** | Read-Only | Sign-Off Authorization | Full Admin Adjudication |

---

## 4. Multi-Factor Geospatial Matching Formula

The matching engine reconciles official revenue polygons with drone photogrammetry polygons using a weighted composite confidence score:

$$\text{Confidence Score} = 0.45 \times \text{IoU} + 0.25 \times \text{Area Similarity} + 0.20 \times \text{Centroid Distance Score} + 0.10 \times \text{Survey Number Match}$$

Where:
- $\text{IoU} = \frac{\text{Area}(P_{\text{cadastral}} \cap P_{\text{drone}})}{\text{Area}(P_{\text{cadastral}} \cup P_{\text{drone}})}$
- $\text{Area Similarity} = \frac{\min(\text{Area}_{\text{cad}}, \text{Area}_{\text{drone}})}{\max(\text{Area}_{\text{cad}}, \text{Area}_{\text{drone}})}$
- $\text{Centroid Score} = \max\left(0, 1.0 - \frac{d_{\text{centroid}}(\text{meters})}{25.0}\right)$

### Status Determination:
- $\text{Score} \ge 0.85 \land \text{IoU} \ge 0.75 \implies \mathbf{MATCHED}$
- $\text{Score} \ge 0.65 \lor (\text{IoU} \ge 0.50 \land d < 15\text{m}) \implies \mathbf{POSSIBLE\_MATCH}$
- $\text{IoU} > 0.10 \land \text{Divergence} > 5\% \implies \mathbf{CONFLICT}$
- Otherwise $\implies \mathbf{NO\_MATCH}$

---

## 5. 24-Layer GIS Workbench Stack

The GIS workbench integrates 24 synchronized layers:

### A. Imagery & Photogrammetry (Layers 1–7)
1. Base Satellite / OpenStreetMap
2. Raw Camera Optical Exif Footprints
3. Drone Flight RTK Trajectory
4. 2.5cm/pixel True-Scale 2D Orthomosaic
5. 3D LiDAR Point Cloud Footprint
6. 50cm Bare-Earth DEM Elevation
7. 50cm Surface DSM Elevation

### B. Drone Boundaries & GIS (Layers 8–12)
8. Detected Field Parcels (Vector Polygons)
9. Extracted Physical Bunds
10. Surveyor Manually Edited Boundaries
11. Land Classification Shading
12. Legacy Historical Boundary Overlays

### C. Prompt 4 AI Intelligence (Layers 13–18)
13. AI Land-Use Classification Regions
14. AI Boundary Ridge Candidates
15. AI Confidence Heatmap
16. Historical Change Shifts
17. Potential Encroachments Alert Layer
18. AI Inference Audit Trail

### D. Prompt 5 Cadastral & Land Records (Layers 19–24)
19. **Official Cadastral Parcels (Revenue Settlement)**: Authoritative Khasra boundary polygons.
20. **Parcel Ownership Status**: Color-coded by title status (Clear, Joint, Disputed).
21. **Historical Cadastral Boundaries (1998)**: 1998 Settlement Survey baseline comparison.
22. **Drone-Measured Parcels (Prompt 3 Fusion)**: Modern RTK/LiDAR high-accuracy boundary.
23. **Surveyor-Verified Authoritative Parcels**: Legally adjudicated and locked boundaries.
24. **Parcel Conflict & Encroachment Layer**: Cross-hatched alert polygons for critical discrepancies.
