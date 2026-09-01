# BhoomiSync — RBAC Permission Matrix (Prompt 6)

## Canonical System Roles

| Role                  | Description                                          |
|-----------------------|------------------------------------------------------|
| `PUBLIC`              | Citizen / Land Owner (Khatedar). Public data only.   |
| `SURVEYOR`            | Cadastral surveyor. Drone data, boundary verification.|
| `GOVERNMENT_OFFICIAL` | Tehsildar / Revenue officer. Record import, titles.  |
| `ADMIN`               | System administrator. Full control, user management. |

---

## Granular Permission Definitions

| Permission               | Scope                                          |
|--------------------------|------------------------------------------------|
| `*`                      | Wildcard — full access (ADMIN only)            |
| `survey.read`            | View survey missions and metadata              |
| `survey.create`          | Create new survey missions                     |
| `survey.update`          | Modify survey status and parameters            |
| `dataset.read`           | View uploaded drone datasets                   |
| `dataset.upload`         | Upload camera/LiDAR/RTK data                   |
| `dataset.delete`         | Delete uploaded datasets                       |
| `processing.start`       | Trigger geospatial processing pipelines        |
| `processing.read`        | View processing job status                     |
| `parcel.read.public`     | View parcels with privacy masking              |
| `parcel.read.private`    | View parcels with full owner details           |
| `parcel.create`          | Create new parcel boundaries                   |
| `parcel.verify`          | Sign-off on parcel verification                |
| `boundary.edit`          | Edit boundary vertices                         |
| `ai.infer`              | Run AI classification / detection              |
| `ai.verify`             | Verify AI predictions (human-in-the-loop)      |
| `land_record.read`      | View land records                              |
| `land_record.import`    | Batch import cadastral records                 |
| `land_record.title_update`| Update ownership title records               |
| `gis.layers`            | Access GIS layer manifests                     |
| `user.read`             | List and inspect user accounts                 |
| `user.create`           | Create user accounts                           |
| `user.update`           | Modify user status, roles, permissions         |
| `user.delete`           | Deactivate/delete user accounts                |
| `audit.read`            | View security audit log entries                |

---

## Role-Permission Matrix

| Permission               | PUBLIC | SURVEYOR | GOV_OFFICIAL | ADMIN |
|--------------------------|--------|----------|--------------|-------|
| `survey.read`            | ✅     | ✅       | ✅           | ✅    |
| `survey.create`          | ❌     | ✅       | ✅           | ✅    |
| `survey.update`          | ❌     | ✅       | ❌           | ✅    |
| `dataset.read`           | ✅     | ✅       | ✅           | ✅    |
| `dataset.upload`         | ❌     | ✅       | ❌           | ✅    |
| `dataset.delete`         | ❌     | ❌       | ❌           | ✅    |
| `processing.start`       | ❌     | ✅       | ❌           | ✅    |
| `processing.read`        | ❌     | ✅       | ✅           | ✅    |
| `parcel.read.public`     | ✅     | ✅       | ✅           | ✅    |
| `parcel.read.private`    | ❌     | ✅       | ✅           | ✅    |
| `parcel.create`          | ❌     | ✅       | ❌           | ✅    |
| `parcel.verify`          | ❌     | ✅       | ❌           | ✅    |
| `boundary.edit`          | ❌     | ✅       | ❌           | ✅    |
| `ai.infer`              | ❌     | ✅       | ❌           | ✅    |
| `ai.verify`             | ❌     | ✅       | ❌           | ✅    |
| `land_record.read`      | ✅     | ✅       | ✅           | ✅    |
| `land_record.import`    | ❌     | ❌       | ✅           | ✅    |
| `land_record.title_update`| ❌   | ❌       | ✅           | ✅    |
| `gis.layers`            | ✅     | ✅       | ✅           | ✅    |
| `user.read`             | ❌     | ❌       | ✅           | ✅    |
| `user.create`           | ❌     | ❌       | ❌           | ✅    |
| `user.update`           | ❌     | ❌       | ❌           | ✅    |
| `user.delete`           | ❌     | ❌       | ❌           | ✅    |
| `audit.read`            | ❌     | ❌       | ✅           | ✅    |

---

## Privacy Projection Rules

The active user's permissions determine which DTO projection is applied:

| Permission              | DTO Projection        | Owner Name | Owner ID  | Contact   |
|-------------------------|-----------------------|------------|-----------|-----------|
| `parcel.read.private`   | `AdminParcelDTO`      | Full       | Full      | Full      |
| `parcel.read.public`    | `PublicParcelDTO`     | Masked     | Hidden    | Hidden    |
| Neither                 | 403 Forbidden         | —          | —         | —         |

---

## Extensibility

New roles can be added at any time:
1. Add a new `Role` row in the database.
2. Map permissions to the role via `role_permissions`.
3. Assign the role to users via `user_roles`.

No code changes are required — the permission engine is entirely data-driven.
