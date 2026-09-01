# BhoomiSync Data Lineage & Provenance Specification

## Lineage Directed Acyclic Graph (DAG)

Every derived layer in BhoomiSync is mathematically and historically traceable to the raw sensor acquisitions from which it was generated.

```
Survey: SUR-2026-001
  │
  ├── Raw Camera Dataset (DS-2026-001-CAM) [IMMUTABLE]
  │     │
  │     └── [Photogrammetry Bundle Adjustment]
  │           │
  │           └── Processed Orthomosaic (DS-2026-001-ORTHO)
  │                 │
  │                 └── [AI Bund Segmentation]
  │                       │
  │                       └── AI Parcel Boundaries (DS-2026-001-AI-PRC)
  │                             │
  │                             └── Verified Cadastral Parcels (PRC-01 to PRC-05)
  │
  └── Raw LiDAR Dataset (DS-2026-001-LID) [IMMUTABLE]
        │
        └── [Cloth Simulation Filter (CSF)]
              │
              └── Bare-Earth DEM Raster (DS-2026-001-DEM)
```

## Immutability Guarantee
- Raw datasets are flagged with `is_immutable = True`.
- Object storage keys are keyed by mission ID and SHA-256 hash.
- Modifications to parcel boundaries create version increments and immutable `ParcelAuditLog` records rather than overwriting previous geometry.
