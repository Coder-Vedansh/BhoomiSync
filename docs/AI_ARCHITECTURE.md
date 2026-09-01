# BhoomiSync — AI Land Classification, Boundary Intelligence & Historical Change Detection Architecture

## 1. Executive Architectural Overview

BhoomiSync Prompt 4 establishes the AI Intelligence layer on top of the drone data ingestion (Prompt 2) and geospatial processing & 2D GIS map engine (Prompt 3). It introduces modular, swappable deep learning abstractions for **8-class agricultural land-use segmentation**, **multi-sensor candidate boundary extraction** (fusing LiDAR bare-earth elevation ridges with high-resolution RGB texture gradients and DEM slope vectors), and **historical cadastral change detection** with potential encroachment alerts.

```
+-----------------------------------------------------------------------------------+
|                           BHOOMISYNC AI INTELLIGENCE LAYER                       |
+-----------------------------------------------------------------------------------+
                                          |
    +-------------------------------------+-------------------------------------+
    |                                     |                                     |
    v                                     v                                     v
+-----------------------+     +-----------------------+     +-----------------------+
|  Land Classification  |     | Boundary Intelligence |     |    Change Detection   |
|   (8 Land-Use Types)  |     |  (Multi-Sensor Ridge) |     |  (Historical Cadastre)|
+-----------------------+     +-----------------------+     +-----------------------+
    |                                     |                                     |
    | 8 Classes:                          | Fusion Sources:                     | Temporal Baseline:
    | - AGRICULTURAL                      | - LiDAR CSF Bund Ridge              | - 1998 Revenue Cadastre
    | - FALLOW                            | - RGB Color/Texture Grad            | - Modern Drone Resurvey
    | - VEGETATION                        | - Bare-Earth DEM Slope              | Detected Shifts:
    | - WATER                             | - Historical Cadastre               | - Boundary Displacements
    | - BUILDING                          | Surveyor Verification:              | - Unauthorized Buildings
    | - ROAD                              | - CANDIDATE -> VERIFIED             | - Land-Use Shifts
    | - BARREN                            | - Immutable AIAuditLog              | - Potential Encroachments
    | - OTHER                             |                                     |
    +-------------------------------------+-------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        BaseAIModel Production Abstraction                         |
| (load() | validate_input() | predict() | postprocess() | get_model_metadata())    |
+-----------------------------------------------------------------------------------+
                                          |
    +------------------+------------------+------------------+------------------+
    |                  |                  |                  |                  |
    v                  v                  v                  v                  v
+--------------+ +--------------+ +--------------+ +--------------+ +---------------+
|  YOLOModel   | | Segmentation | | BoundaryModel| | AgriDetector | | ChangeDetection|
|   Adapter    | |    Adapter   | |    Adapter   | |    Adapter   | |     Adapter   |
+--------------+ +--------------+ +--------------+ +--------------+ +---------------+
```

---

## 2. Core Modules in `backend/app/modules/ai/`

The AI package is structured under `backend/app/modules/ai/`:

1. `common/`:
   - `base_model.py`: `BaseAIModel` abstract base class defining standard lifecycle hooks.
   - `preprocessing.py`: `AIPreprocessor` creating spatial bounding boxes, GSD normalization, and sensor channel matrices.
   - `postprocessing.py`: `AIPostprocessor` computing closed-polygon topology, geodesic planar area ($m^2$, ha), and 3D surface area ($A_{\text{surface}} = \frac{A_{\text{planar}}}{\cos(\theta)}$).
   - `confidence.py`: `ConfidenceManager` classifying scores into `HIGH` ($\ge 0.90$), `MEDIUM` ($0.70 - 0.89$), and `LOW` ($< 0.70$) tiers.
   - `model_registry.py`: `ModelRegistry` runtime singleton.
2. `classification/`:
   - `classifier.py`: `LandUseClassifier` producing 8-class thematic segmentation.
   - `model_loader.py`: `YOLOModelAdapter` and `SegmentationModelAdapter`.
   - `service.py` & `router.py`: `POST /api/v1/ai/classification/predict`, `GET /api/v1/ai/classification/survey/{id}`.
3. `boundary_detection/`:
   - `detector.py`: `MultiSensorBoundaryDetector` fusing LiDAR elevation ridges and RGB edges.
   - `model_loader.py`: `BoundaryModelAdapter`.
   - `service.py`: Candidate boundary detection, surveyor verification (`POST /verify`), rejection (`POST /reject`), and vertex adjustment (`POST /edit`).
   - `router.py`: `POST /api/v1/ai/boundary/detect`, `POST /api/v1/ai/boundary/{id}/verify`, etc.
4. `land_use/`:
   - `land_use_classifier.py`: Dedicated agricultural plot and crop vigor detector.
   - `router.py`: `POST /api/v1/ai/land-use/agricultural-detect`.
5. `change_detection/`:
   - `change_detector.py`: `HistoricalChangeDetector` evaluating temporal drifts against 1998 cadastre.
   - `service.py` & `router.py`: `POST /api/v1/ai/change-detection`, `GET /api/v1/ai/change-detection/{survey_id}`.
6. `inference/`:
   - `inference_engine.py`: `MultiSensorInferenceEngine` orchestrating parallel AI suite.
   - `router.py`: `POST /api/v1/ai/inference/run-all`, `GET /api/v1/ai/models`.
7. `training/`:
   - `dataset_manager.py`: Architecture for training datasets, annotations, and validation metrics (mIoU, F1-Score).

---

## 3. PostGIS Database Schema

The database is extended in `backend/app/models/ai_results.py` and `infrastructure/database/init-postgis.sql`:

- `ai_models`: Model metadata, version, framework, classes, input requirements, checksum.
- `ai_inference_results`: Execution container linking `Survey`, `ProcessingJob`, execution runtime ms, overall confidence, and summary metrics.
- `ai_classification_results`: 8-class land use polygon geometries with computed area ($m^2$, ha) and percentage.
- `ai_boundary_results`: Multi-sensor candidate boundaries with confidence, sources list, length (m), area ($m^2$), and `AIVerificationStatus` (`CANDIDATE`, `VERIFIED`, `REJECTED`, `MANUALLY_EDITED`).
- `ai_change_results`: Historical change records with `AIChangeSeverity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL_ENCROACHMENT`), old value, new value, affected area, and percentage drift.
- `ai_audit_logs`: Immutable tracking of surveyor actions (`ACCEPT_VERIFY`, `REJECT`, `EDIT_VERTICES`) with original AI JSON, edited GeoJSON, reason, surveyor ID, and timestamp.

---

## 4. Human-in-the-Loop & Legal Cadastral Compliance

1. **Candidate Boundary Policy**: All AI-detected lines and bunds remain strictly tagged as `CANDIDATE` and are never automatically treated as legal boundaries.
2. **Authorized Verification**: A certified land surveyor reviews candidate boundaries in the UI or GIS workbench and triggers explicit authorization via `POST /api/v1/ai/boundary/{id}/verify`.
3. **Audit Lineage**: Every manual modification or verification generates an immutable `AIAuditLog` record preserving the original AI prediction tensor/polygon alongside the surveyor's edited geometry and timestamp.
4. **Terminology**: Temporal discrepancies are labeled as "Potential Boundary Change" or "Potential Encroachment Alert" until ground-truthed and confirmed by authorized revenue authorities.
