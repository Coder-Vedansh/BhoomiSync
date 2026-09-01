# BhoomiSync — AI Workbench & Surveyor Verification Guide

## 1. Introduction

The **BhoomiSync AI Intelligence & Analysis Workbench** enables revenue officers, cadastral surveyors, and GIS analysts to perform automated land-use classification, multi-sensor farm boundary candidate extraction, and historical cadastral change detection on high-resolution drone survey datasets.

---

## 2. Using the AI Intelligence Dashboard

1. **Accessing the Workbench**:
   - In the sidebar, click on **AI Intelligence & Analysis** (badged with `PROMPT 4`).
2. **Survey Selector & Metrics**:
   - Select the target survey (e.g. `SUR-2026-001 — Haripura Agricultural Resurvey Pilot`).
   - The dashboard displays 5 operational metric cards:
     - **Land-Use Segmentation**: 8 Cadastral classes with percentage breakdown.
     - **Candidate Boundaries**: Multi-sensor LiDAR elevation ridge extractions.
     - **Historical Changes**: Temporal discrepancies compared to historical cadastre.
     - **Potential Encroachments**: High-severity spatial encroachment alerts.
     - **AI Models Deployed**: Active neural network models in the registry.
3. **Configuring Confidence Threshold**:
   - Adjust the **Confidence Threshold** slider (default 60%). Detections below this threshold are filtered out to reduce false positives.
4. **Triggering Inferences**:
   - Click **Run Full AI Fusion Suite** to execute parallel multi-sensor classification, candidate boundary segmentation, and historical change detection.

---

## 3. Human-in-the-Loop Surveyor Verification

### A. Candidate Boundary Confirmation
- Under the **Candidate Bunds** tab, review AI-detected farm bund ridges.
- Each boundary candidate displays its length (m), estimated planar area ($m^2$), confidence percentage, and contributing sensor sources (e.g., `LIDAR + RGB_ORTHOMOSAIC + DEM_GRADIENT`).
- **Accept / Verify**: Click **Accept / Verify** to certify the boundary. The boundary status updates to `VERIFIED` with a green badge and creates an immutable audit record.
- **Reject**: Click **Reject** to dismiss temporary ditches, tractor tracks, or false positives.

### B. Interactive 18-Layer GIS Map
- In the top-right HUD of the interactive map, toggle between the 18 available GIS layers:
  - `13. AI Land Classification`: Thematic color-coded land use polygons.
  - `14. AI Candidate Bunds`: High-resolution candidate farm bund outlines.
  - `16. Historical Change Shifts`: Spatial vector offsets from the 1998 baseline.
  - `17. Potential Encroachments`: Pulsing red alerts highlighting unauthorized structures.
  - `4. 2D Orthomosaic`: 2.5 cm/pixel true-color imagery.
  - `6. Bare-Earth DEM`: 50 cm bare-earth elevation raster.
  - `5. LiDAR Point Cloud`: 3D point cloud ground grid.
  - `3. RTK Trajectory`: High-precision centimeter-accurate flight line.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/ai/models` | List all deployed AI models in registry |
| `POST` | `/api/v1/ai/classification/predict` | Run 8-class land segmentation |
| `GET` | `/api/v1/ai/classification/survey/{id}` | Get survey classification polygons |
| `POST` | `/api/v1/ai/boundary/detect` | Run multi-sensor boundary intelligence |
| `GET` | `/api/v1/ai/boundary/survey/{id}` | Get candidate boundaries |
| `POST` | `/api/v1/ai/boundary/{id}/verify` | Authorize surveyor boundary verification |
| `POST` | `/api/v1/ai/boundary/{id}/reject` | Reject false-positive boundary |
| `POST` | `/api/v1/ai/boundary/{id}/edit` | Save surveyor vertex adjustments |
| `POST` | `/api/v1/ai/change-detection` | Run historical survey comparison |
| `GET` | `/api/v1/ai/change-detection/{id}` | Get historical change detections & encroachments |
| `POST` | `/api/v1/ai/inference/run-all` | Trigger full multi-sensor AI fusion suite |
