# BhoomiSync Digital Survey Reporting & Export System Architecture (Prompt 7)

## 1. Overview & System Purpose

The **BhoomiSync Digital Land Survey Reporting & Export System** translates raw sensor telemetry, computational photogrammetry, AI intelligence inferences, and legal cadastral records into immutable, multi-format land dossiers.

The reporting engine is governed by strict compliance, cryptographic integrity, and clear categorization of data origin:
- **RAW DATA**: Drone flight telemetry, camera EXIF, raw LiDAR `.las` point clouds, RTK/GNSS carrier phase logs.
- **AI GENERATED DATA**: Deep learning land-use/land-cover (LULC) segmentation, boundary candidate predictions, and automated temporal change detections.
- **SYSTEM CALCULATED DATA**: WGS84/UTM georeferencing, photogrammetric orthomosaics, DEM/DSM elevation models, geodesic planar area ($m^2$), and 3D surface mesh area ($m^2$).
- **OFFICIAL / GOVERNMENT DATA**: Baseline village settlement records, Jamabandi/RoR khasra numbers, and revenue department cadastre maps.
- **SURVEYOR VERIFIED DATA**: Field-validated ground control points (GCPs), licensed surveyor boundary sign-offs, and legally certified coordinates.

---

## 2. Core Architectural Components

```
                +-----------------------------------------------------+
                |           Survey Mission & Cadastral Records        |
                +-----------------------------------------------------+
                                           |
                                           v
                +-----------------------------------------------------+
                |       ReportSnapshotService (Immutable Data Freeze) |
                |       - Deterministic JSON Data Serialization       |
                |       - SHA-256 Checksum Calculation                |
                |       - Dynamic RBAC PII Masking                    |
                +-----------------------------------------------------+
                                           |
                                           v
       +-----------------------------------+-----------------------------------+
       |                   |                       |                           |
       v                   v                       v                           v
+---------------+  +---------------+       +---------------+           +---------------+
|  PDFGenerator |  |GeoJSONGenerator|      |  KMLGenerator |           |  CSVGenerator |
| (ReportLab)   |  | (RFC 7946)    |       | (OpenGIS KML) |           |  (Tabular)    |
+---------------+  +---------------+       +---------------+           +---------------+
       |                   |                       |                           |
       +-------------------+-----------------------+---------------------------+
                                           |
                                           v
                +-----------------------------------------------------+
                |           StorageProvider (S3 / Local Mock)         |
                |           + ReportAuditLog & Export Tracking        |
                +-----------------------------------------------------+
```

---

## 3. Production Export Formats

| Format | Standard / Engine | Target Audience / Consumer | Description |
| :--- | :--- | :--- | :--- |
| **PDF** | ReportLab 5.0 (11 Pages) | Revenue Officers, Landowners, Courts | Publication-grade cadastral dossier featuring executive summary, 2D vector map, RTK accuracy matrix, AI land use breakdown, and surveyor digital sign-off. |
| **GeoJSON** | RFC 7946 FeatureCollection | GIS Specialists, Web Map Portals | Structured multi-layer vector geometry containing Official, Historical, Drone, and Surveyor-Verified boundary layers. |
| **KML** | OpenGIS KML 2.2 | Google Earth, QGIS, Civil 3D | Styled 3D placemarks and polygons with attribute balloons and altitude clamping. |
| **CSV** | RFC 4180 Tabular CSV | Revenue Accountants, Data Analysts | Tabular vertex coordinates (Latitude, Longitude, Elevation, Northing, Easting) and comparative area measurements. |
| **JSON** | Schema-Validated JSON | Microservices, API Integrators | Machine-readable data envelope categorized by data source and stamped with SHA-256 snapshot hash. |

---

## 4. Cryptographic Immutability & Audit Trail

Every report generation locks the survey data into an immutable snapshot:
1. **Canonical JSON Serialization**: Dict keys sorted alphabetically, datetime objects ISO-formatted.
2. **SHA-256 Hashing**: Generates an authoritative 64-character hexadecimal digest.
3. **Cross-Format Embedding**: The SHA-256 checksum is printed on the PDF header, embedded in GeoJSON `properties.snapshot_checksum_sha256`, and logged in `ReportExport` records.
4. **Tamper Prevention**: Any subsequent edit or boundary modification increments the report version ($v1.0 \rightarrow v2.0$) and creates a new immutable snapshot record.

---

## 5. Statutory Legal Disclaimer

All generated reports, PDFs, and exports carry the mandatory legal notice:
> **STATUTORY DISCLAIMER**: This Digital Land Survey Report is an analytical summary generated from aerial drone imagery, LiDAR telemetry, and computational geospatial intelligence. It does not constitute a legally binding property deed or land title. Official title validity and legal boundary determinations are subject to confirmation by the competent state revenue authorities.
