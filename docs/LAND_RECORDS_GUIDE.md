# BhoomiSync Land Records & Cadastral Intelligence User Guide

## 1. Introduction

Welcome to the **BhoomiSync Land Records & Cadastral Intelligence Module**. This guide details how surveyors, revenue officers, and public users can explore cadastral land records, verify drone boundaries, inspect title histories, and detect discrepancies.

---

## 2. Navigating the Land Records Registry

1. Open **BhoomiSync** and select **"Land Records & Cadastre"** from the left navigation sidebar.
2. The top summary cards display key KPIs:
   - **Total Parcels**: Complete registered cadastral count for Haripura Village.
   - **Surveyor Verified**: Authoritative boundaries confirmed against RTK ground truth.
   - **Area Variation > 2%**: Parcels exhibiting noticeable difference between revenue sheets and physical drone surveys.
   - **Conflicts / Encroachments**: Land units requiring immediate surveyor adjudication.

---

## 3. Privacy & Role Switcher

Use the top-right role selector to toggle between user perspectives:
- **Public (Masked)**: Replaces Khatedar personal names with masked aliases (e.g. `R***** P****`) and omits private contact references.
- **Surveyor (Full)**: Displays full legal ownership names, Khasra numbers, and enables the surveyor verification form.
- **Admin (Audit)**: Unlocks complete ownership percentage breakdowns, co-owner mutation histories, and document upload logs.

---

## 4. 4-Way Area & Geometry Comparison

Click on any parcel in the table or GIS map, then select **"Deep Dive & 4-Way Compare"** to open the dedicated parcel analysis view (`/parcels/:parcelId`):

- **1. Official Revenue Area**: Legal baseline recorded in Apna Khata / Jamabandi records.
- **2. Drone Measured Area**: High-precision physical area derived from BhoomiSync RTK photogrammetry and LiDAR elevation.
- **3. 1998 Historical Cadastre**: Historical revenue settlement baseline geometry.
- **4. Surveyor Verified Area**: Adjudicated authoritative measurement signed off by field revenue officials.

---

## 5. 24-Layer GIS Cadastral Workbench

Use the floating **24 GIS Map Layers** control in the top-right corner to toggle between imagery, drone boundaries, AI detections, and cadastral layers:
- **Layer 19 (Official Cadastral Parcels)**: Yellow boundary line representing legal Khasra polygons.
- **Layer 20 (Ownership Status)**: Color codes parcels by title status (Green = Clear, Purple = Joint Family, Red = Disputed).
- **Layer 21 (1998 Historical Cadastre)**: Purple dashed line showing the 1998 settlement boundary.
- **Layer 22 (Drone Measured Boundaries)**: Cyan line representing modern physical bunds.
- **Layer 23 (Surveyor-Verified Parcels)**: Solid emerald green line for approved boundaries.
- **Layer 24 (Encroachments & Conflicts)**: Red alert polygons marking structural incursions or boundary shifts.

---

## 6. Batch Land Record Importer

1. In the Land Records header, click **"Import Records"**.
2. Select your file format (**CSV**, **GeoJSON**, **JSON**, or **Mock Government Dataset**).
3. Paste raw file content or select the mock dataset.
4. Click **"Execute Import Session"**. The system validates the schema, computes SHA-256 integrity checksums, rejects duplicates by `parcel_id`, and adds parcels to the database with full provenance logging.

---

## 7. Surveyor Verification Sign-Off

1. In the Parcel Deep Dive page, navigate to the **Surveyor Boundary Verification Sign-Off** form.
2. Enter your adjudication notes and select the appropriate status (`SURVEYOR_VERIFIED`, `DISPUTED`, or `PENDING`).
3. Click **"Authorize"**. The system locks the verified boundary, updates audit history, and displays the authoritative verification badge.
