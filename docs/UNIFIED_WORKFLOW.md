# BhoomiSync — Unified Operational Cadastral Workflow

## 1. End-to-End Operational Lifecycle

The BhoomiSync workflow connects field drone operations with revenue office legal publication in a seamless 6-step lifecycle:

```
[ STEP 1: FLIGHT PLANNING & SENSOR SETUP ]
  │ • Define survey bounding polygon in GIS Workbench
  │ • Configure u-blox ZED-F9P RTK Base Station / NTRIP caster
  │ • Connect ESP32 Flight Computer to drone payload (RGB + Livox LiDAR)
  ▼
[ STEP 2: LIVE MISSION INGESTION ]
  │ • Drone launches and streams telemetry over cellular 5G (10 Hz)
  │ • BhoomiSync Ingestion API validates SHA-256 checksums
  │ • Direct streaming into Cloudflare R2 private bucket
  │ • Real-time flight vector and telemetry visible in GIS Workbench
  ▼
[ STEP 3: 11-STAGE CLOUD PROCESSING & AI FUSION ]
  │ • Structure-from-Motion (SfM) creates 1.2 cm/px Orthomosaic
  │ • Bare-earth DEM elevation mesh generated
  │ • DeepLabV3+ classifies 8-class Land-Use/Land-Cover (LULC)
  │ • Segment Anything Model (SAM) extracts sub-centimeter field bunds
  │ • 3D geodesic slope-adjusted surface area computed
  ▼
[ STEP 4: CADASTRAL REGISTRY MATCHING & DISCREPANCY ANALYSIS ]
  │ • Match drone boundaries against authoritative Khatoni revenue records
  │ • Automated 4-way area comparison matrix (Official, Historical, Drone, 3D)
  │ • Flag boundary shifts, area variances > 1%, and encroachment risks
  ▼
[ STEP 5: SURVEYOR VERIFICATION & VERTEX EDITING ]
  │ • Field surveyor inspects Khasra parcels in GIS Workbench
  │ • If needed, adjust vertices with live 2D/3D area recalculation
  │ • Digitally sign off and anchor verified boundaries in PostGIS
  ▼
[ STEP 6: PUBLICATION OF OFFICIAL SURVEY DOSSIERS ]
  │ • 1-Click generation of authoritative Form 1-A PDF dossiers
  │ • Export GIS layers in GeoJSON, KML, CSV, and JSON
  │ • Revenue officer approval and cryptographic blockchain/SHA-256 anchoring
```

---

## 2. Surveyor Quick Start Checklist

1. **Dashboard Check**: Verify drone hardware connection, RTK Fix status (`FIXED 1.4 cm`), and Cloudflare R2 bucket connection.
2. **Launch Live Mission**: In **GIS Workbench**, monitor real-time flight telemetry, altitude MSL, and camera shot coordinates.
3. **Execute AI & Fusion**: Click `Run AI & Fusion` to run the 11-stage photogrammetry and bund detection pipeline.
4. **Inspect & Verify**: Open the **Land Registry** or click any parcel in the GIS map. Check the 4-way area comparison, resolve any encroachment alerts, and click `Verify Boundary Sign-Off`.
5. **Generate & Export Dossier**: In **Reports & Exports**, download the official signed Form 1-A PDF or GeoJSON/KML boundary files for village records.
