# BhoomiSync Architecture Specification

## 1. Architectural Philosophy & Separation of Concerns

BhoomiSync is engineered around three core design principles:
1. **Decoupled Sensor Acquisition**: The backend never communicates directly with hardware buses or proprietary communication links. All transmissions pass through the `DataGateway` abstraction layer (`ESP32PhoneGateway` in the prototype, `CompanionComputerGateway` in production).
2. **Strict Scope Restriction**: Flight control (MAVLink, ArduPilot, PX4, waypoint navigation) is strictly isolated and not part of the BhoomiSync platform. BhoomiSync begins after sensor payloads are captured.
3. **Data Lineage Immutability**: Raw sensor datasets (Camera images, LiDAR LAS/LAZ, RTK trajectory logs) are immutable and stored in Object Storage with SHA-256 checksums. Derived layers (Orthomosaics, DEM, AI vectors) maintain explicit parent-child lineage records in PostGIS.

## 2. Abstraction Layers

### Data Gateway Abstraction (`modules/cloud_ingestion/gateway/`)
- `DataGateway`: Base interface defining telemetry streaming and sensor payload ingestion.
- `ESP32PhoneGateway`: Implements current prototype relay (ESP32 -> Phone -> Internet -> BhoomiSync).
- `CompanionComputerGateway`: Future high-bandwidth direct onboard drone edge-computing interface.

### Cloud Storage Abstraction (`modules/cloud_ingestion/storage_provider.py`)
- `CloudStorageProvider`: Base interface defining `upload_file`, `download_file`, `delete_file`, `list_files`, `get_file_metadata`, and `get_download_url`.
- `MockStorageProvider`: Local filesystem backing for dev & air-gapped environments.
- Ready for pluggable `S3StorageProvider`, `AzureBlobStorageProvider`, and `GoogleCloudStorageProvider`.

### Cadastral Geometry Engine (`modules/gis/spatial_utils.py`)
- Computes geodesic ellipsoidal area (m², ha, acres) using Chamberlain-Duquette spherical excess equations on the WGS84 ellipsoid.
- Computes geodesic perimeter (m) and coordinates in EPSG:4326 / projected UTM zones.
- Physical dimensions are invariant of map zoom.
