# BhoomiSync REST API Specification

All API endpoints are prefixed with `/api`.

## 1. System Health
- **`GET /api/health`**
  - Returns current system health, database state, storage provider, and active gateway type.

## 2. Surveys Module
- **`GET /api/surveys`**
  - Query params: `page` (int), `page_size` (int)
  - Returns list of survey missions.
- **`POST /api/surveys`**
  - Request body: `SurveyCreate`
  - Registers a new survey campaign.
- **`GET /api/surveys/{survey_id}`**
  - Returns full survey details and boundary GeoJSON.
- **`GET /api/surveys/{survey_id}/datasets`**
  - Returns all datasets associated with the survey.
- **`GET /api/surveys/{survey_id}/parcels`**
  - Returns all georeferenced parcels with physical area in m² and hectares.
- **`GET /api/surveys/{survey_id}/lineage`**
  - Returns DAG nodes and transformation edges.

## 3. Datasets Module
- **`GET /api/datasets/{dataset_id}`**
  - Returns dataset metadata and file references.
- **`GET /api/datasets/{dataset_id}/files`**
  - Returns stored object files, storage keys, and checksums.

## 4. Parcels & Boundary Audit
- **`GET /api/parcels/{parcel_id}`**
  - Returns single parcel geometry and land use.
- **`GET /api/parcels/{parcel_id}/history`**
  - Returns version history and audit log.
- **`PUT /api/parcels/{parcel_id}/geometry`**
  - Applies surveyor boundary edit, recalculates geodesic area, records audit log.
- **`PUT /api/parcels/{parcel_id}/status`**
  - Updates verification status.

## 5. AI Modules
- **`GET /api/ai/modules`**
  - Lists registered AI submodules.
- **`POST /api/ai/land-classification/run`**
- **`POST /api/ai/parcel-boundary/run`**
- **`POST /api/ai/change-detection/run`**

## 6. GIS & Measurements
- **`GET /api/gis/status`**
- **`POST /api/gis/measure`**

## 7. Historical Comparison
- **`GET /api/comparison/status`**
- **`GET /api/comparison/surveys/{survey_id}`**
