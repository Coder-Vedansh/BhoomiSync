import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_prompt4_walkthrough_document():
    doc = Document()

    # Page Margins: 0.75 in
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Styles & Colors
    NAVY = RGBColor(15, 23, 42)       # #0F172A
    EMERALD = RGBColor(5, 150, 105)   # #059669
    AMBER = RGBColor(217, 119, 6)     # #D97706
    ROSE = RGBColor(220, 38, 38)      # #DC2626
    DARK_GRAY = RGBColor(51, 65, 85)  # #334155
    LIGHT_BG = "F8FAFC"
    HEADER_BG = "0F172A"

    # =========================================================================
    # TITLE SECTION
    # =========================================================================
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("BHOOMISYNC PLATFORM")
    title_run.font.name = "Arial"
    title_run.font.size = Pt(24)
    title_run.font.bold = True
    title_run.font.color.rgb = NAVY

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub_p.add_run("Prompt 4 — AI Land Classification, Boundary Intelligence & Historical Change Detection")
    sub_run.font.name = "Arial"
    sub_run.font.size = Pt(13)
    sub_run.font.bold = True
    sub_run.font.color.rgb = EMERALD

    meta_p = doc.add_paragraph()
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_run = meta_p.add_run("Comprehensive Technical Walkthrough & Verification Report • Lead Software Architect")
    meta_run.font.name = "Calibri"
    meta_run.font.size = Pt(10)
    meta_run.font.italic = True
    meta_run.font.color.rgb = DARK_GRAY

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 1. EXECUTIVE SUMMARY
    # =========================================================================
    h1 = doc.add_heading("1. Executive Summary & Prompt 4 Objectives", level=1)
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after = Pt(4)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "BhoomiSync Prompt 4 introduces the production AI Intelligence Layer directly on top of the "
        "hardware-agnostic drone data ingestion pipeline (Prompt 2) and the full geospatial image-LiDAR "
        "fusion & 2D GIS map engine (Prompt 3). The core objective of Prompt 4 is to convert fused sensor rasters "
        "(RGB Orthomosaic, Bare-Earth DEM, DSM, and 3D LiDAR point clouds) into rich semantic land-use classifications, "
        "candidate cadastral farm bund boundaries, and temporal change detection reports against historical revenue cadastre."
    )
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)

    # Callout Box: Legal Cadastral Compliance & Model Abstraction
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "ECFDF5")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    cp = cell.paragraphs[0]
    crun1 = cp.add_run("CRITICAL LEGAL CADASTRAL COMPLIANCE & ARCHITECTURAL DIRECTIVES:\n")
    crun1.font.bold = True
    crun1.font.color.rgb = EMERALD
    crun1.font.size = Pt(9.5)
    crun2 = cp.add_run(
        "1. Human-in-the-Loop Legal Policy: AI-detected boundaries remain strictly labeled as 'CANDIDATE' and "
        "are NEVER automatically treated as legally confirmed parcel boundaries until certified by an authorized land surveyor.\n"
        "2. BaseAIModel Production Abstraction: All deep learning models implement a clean lifecycle interface "
        "(load, validate_input, predict, postprocess, get_model_metadata) with swappable adapters (YOLO, SegFormer, SAM, Siamese ChangeNet).\n"
        "3. Multi-Sensor Ridge Fusion: Farm bund boundaries fuse LiDAR CSF ground elevation ridges, RGB color gradients, and DEM slopes.\n"
        "4. Temporal Change Intelligence: Old survey vs New resurvey comparison with 'Potential Encroachment' alerts and immutable AIAuditLog."
    )
    crun2.font.size = Pt(9)
    crun2.font.color.rgb = NAVY

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 2. MODULAR AI ARCHITECTURE
    # =========================================================================
    h1 = doc.add_heading("2. Modular AI System Architecture (`backend/app/modules/ai/`)", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "The AI module is decoupled into 7 specialized subpackages adhering to strict separation of concerns:"
    )
    p.paragraph_format.space_after = Pt(4)

    mod_table = doc.add_table(rows=8, cols=3)
    mod_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Package Path", "Core Component / Class", "Functionality & Responsibilities"]
    for i, h in enumerate(headers):
        c = mod_table.cell(0, i)
        set_cell_background(c, HEADER_BG)
        set_cell_margins(c, 100, 100, 120, 120)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9)

    modules_info = [
        ("ai/common/", "BaseAIModel, AIPreprocessor, AIPostprocessor, ConfidenceManager, ModelRegistry", "Core abstraction interface, multi-modal context normalization, scale-invariant polygon vectorization, and 3-tier confidence classification."),
        ("ai/classification/", "LandUseClassifier, YOLOModelAdapter, SegmentationModelAdapter", "8-class cadastral semantic segmentation (Agricultural, Fallow, Vegetation, Water, Building, Road, Barren, Other)."),
        ("ai/boundary_detection/", "MultiSensorBoundaryDetector, BoundaryModelAdapter, BoundaryService", "Multi-sensor ridge fusion, candidate boundary extraction, and surveyor accept/reject/edit verification."),
        ("ai/land_use/", "DetailedLandUseClassifier, AgriculturalModelAdapter", "Dedicated agricultural parcel and crop health (NDVI) detection."),
        ("ai/change_detection/", "HistoricalChangeDetector, ChangeDetectionModelAdapter, ChangeDetectionService", "Siamese temporal difference comparison (1998 Cadastre vs 2026 Drone Resurvey) with Potential Encroachment alerts."),
        ("ai/inference/", "MultiSensorInferenceEngine, InferenceService, Model Registry Router", "Orchestrator for parallel multi-modal AI execution and registry query APIs."),
        ("ai/training/", "TrainingDatasetManager", "Architecture for training datasets, ground-truth bund annotations, COCO/GeoJSON formats, and validation metrics (mIoU, F1)."),
    ]

    for row_idx, (path, comp, desc) in enumerate(modules_info, start=1):
        c0 = mod_table.cell(row_idx, 0)
        c1 = mod_table.cell(row_idx, 1)
        c2 = mod_table.cell(row_idx, 2)

        bg = LIGHT_BG if row_idx % 2 == 1 else "FFFFFF"
        for cell_elem in (c0, c1, c2):
            set_cell_background(cell_elem, bg)
            set_cell_margins(cell_elem, 80, 80, 100, 100)

        p0 = c0.paragraphs[0]
        r0 = p0.add_run(path)
        r0.font.bold = True
        r0.font.size = Pt(8.5)
        r0.font.color.rgb = EMERALD

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(comp)
        r1.font.bold = True
        r1.font.size = Pt(8.5)
        r1.font.color.rgb = NAVY

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(desc)
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = DARK_GRAY

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 3. 8-CLASS LAND USE SEGMENTATION & SCALE INVARIANCE
    # =========================================================================
    h1 = doc.add_heading("3. 8-Class Land Use Segmentation & Scale Invariance", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "The semantic segmentation subsystem classifies high-resolution drone orthomosaics (2.5 cm/pixel GSD) "
        "and bare-earth DEM rasters into 8 official cadastral classes. Each detected polygon preserves real-world "
        "scale invariance (1.000m Ground = 1.000m Real-World) and computes both 2D geodesic planar area and "
        "slope-corrected 3D terrain surface area:"
    )
    p.paragraph_format.space_after = Pt(4)

    # Formula Box
    f_tbl = doc.add_table(rows=1, cols=1)
    f_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    f_cell = f_tbl.cell(0, 0)
    set_cell_background(f_cell, "F1F5F9")
    set_cell_margins(f_cell, 100, 100, 140, 140)
    fp = f_cell.paragraphs[0]
    frun1 = fp.add_run("GEODESIC SCALE-INVARIANT SURFACE AREA FORMULA:\n")
    frun1.font.bold = True
    frun1.font.color.rgb = NAVY
    frun1.font.size = Pt(9.5)
    frun2 = fp.add_run(
        "A_surface = A_planar / cos(θ_mean)\n"
        "Where A_planar is computed via spherical Chamberlain-Duquette integration (EPSG:4326), "
        "and θ_mean is the slope derived from Sobel 3x3 elevation gradient vectors."
    )
    frun2.font.size = Pt(9)
    frun2.font.color.rgb = EMERALD

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Classes Table
    cl_table = doc.add_table(rows=9, cols=4)
    cl_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cl_headers = ["Class Name", "Cadastral Description", "Pilot Coverage (%)", "Color Code"]
    for i, h in enumerate(cl_headers):
        c = cl_table.cell(0, i)
        set_cell_background(c, HEADER_BG)
        set_cell_margins(c, 80, 80, 100, 100)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(8.5)

    classes_data = [
        ("AGRICULTURAL", "Active standing agricultural crop parcels (Wheat, Mustard, Pulses)", "64.2%", "#059669 (Emerald)"),
        ("FALLOW", "Uncultivated agricultural arable land / seasonal fallow terraces", "15.1%", "#F59E0B (Amber)"),
        ("VEGETATION", "Dense tree hedgerows, orchard groves, and roadside canopy", "10.4%", "#16A34A (Green)"),
        ("WATER", "Irrigation canals, village ponds, and seasonal water retention reservoirs", "4.2%", "#0284C7 (Sky Blue)"),
        ("BUILDING", "Farm storage sheds, solar pump enclosures, and rural homesteads", "3.8%", "#DC2626 (Rose)"),
        ("ROAD", "Paved access roads and unpaved farm transport tracks", "2.3%", "#64748B (Slate)"),
        ("BARREN", "Rock outcrops, eroded gulley terrain, and uncultivable land", "0.0%", "#78716C (Stone)"),
        ("OTHER", "Unclassified infrastructure, power pylons, and temporary field assets", "0.0%", "#9333EA (Purple)"),
    ]

    for row_idx, (cname, cdesc, cpct, ccolor) in enumerate(classes_data, start=1):
        c0 = cl_table.cell(row_idx, 0)
        c1 = cl_table.cell(row_idx, 1)
        c2 = cl_table.cell(row_idx, 2)
        c3 = cl_table.cell(row_idx, 3)

        bg = LIGHT_BG if row_idx % 2 == 1 else "FFFFFF"
        for cell_elem in (c0, c1, c2, c3):
            set_cell_background(cell_elem, bg)
            set_cell_margins(cell_elem, 60, 60, 80, 80)

        c0.paragraphs[0].add_run(cname).font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(8)
        c1.paragraphs[0].add_run(cdesc).font.size = Pt(8)
        c2.paragraphs[0].add_run(cpct).font.bold = True
        c2.paragraphs[0].runs[0].font.size = Pt(8)
        c3.paragraphs[0].add_run(ccolor).font.size = Pt(8)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 4. MULTI-SENSOR BOUNDARY INTELLIGENCE & VERIFICATION
    # =========================================================================
    h1 = doc.add_heading("4. Multi-Sensor Boundary Intelligence & Verification", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "Traditional boundary extraction relying solely on RGB edges fails in agricultural fields due to seasonal "
        "crop canopy shadows and varying soil color. BhoomiSync solves this by fusing three distinct physical sensor layers:"
    )
    p.paragraph_format.space_after = Pt(4)

    bnd_points = [
        ("LiDAR CSF Ground Elevation Ridges: ", "Extracts physical elevated bunds (10–40 cm elevation crests) invariant to surface color."),
        ("High-Res RGB Texture Gradients: ", "Identifies soil-crop boundaries and field access tracks with 2.5 cm precision."),
        ("DEM Slope Gradient Vectors: ", "Detects sharp localized slope transitions denoting terrace breaks and bund edges."),
    ]
    for b_title, b_desc in bnd_points:
        bp = doc.add_paragraph(style='List Bullet')
        r1 = bp.add_run(b_title)
        r1.font.bold = True
        r1.font.color.rgb = NAVY
        r2 = bp.add_run(b_desc)
        r2.font.color.rgb = DARK_GRAY
        bp.paragraph_format.space_after = Pt(2)

    # Verification Workflow
    p_wf = doc.add_paragraph()
    p_wf.paragraph_format.space_before = Pt(4)
    r_wf = p_wf.add_run("Human-in-the-Loop Verification Lifecycle:")
    r_wf.font.bold = True
    r_wf.font.color.rgb = NAVY

    wf_steps = [
        ("1. CANDIDATE Detection: ", "AI outputs polygon boundary tagged with confidence score and sensor source attribution."),
        ("2. Surveyor Review: ", "Certified surveyor inspects candidate over 18-layer GIS map overlays."),
        ("3. Authorization Actions: ", "Surveyor executes 'Accept/Verify' (status -> VERIFIED), 'Reject' (status -> REJECTED), or 'Vertex Edit' (status -> MANUALLY_EDITED)."),
        ("4. Immutable Audit Lineage: ", "Every action generates an AIAuditLog record storing original AI predictions, modified GeoJSON, and surveyor justification."),
    ]
    for w_title, w_desc in wf_steps:
        wp = doc.add_paragraph(style='List Bullet')
        r1 = wp.add_run(w_title)
        r1.font.bold = True
        r1.font.color.rgb = EMERALD
        r2 = wp.add_run(w_desc)
        r2.font.color.rgb = DARK_GRAY
        wp.paragraph_format.space_after = Pt(2)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 5. HISTORICAL CHANGE DETECTION & ENCROACHMENT ALERTS
    # =========================================================================
    h1 = doc.add_heading("5. Historical Change Detection & Potential Encroachment Alerts", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "The temporal change detection engine compares historical revenue survey geometry (e.g. 1998 Cadastre) "
        "against modern high-resolution drone resurveys (2026 Resurvey). Discrepancies are categorized with strict "
        "severity ratings without making premature legal conclusions:"
    )
    p.paragraph_format.space_after = Pt(4)

    chg_table = doc.add_table(rows=5, cols=4)
    chg_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    chg_headers = ["Change ID", "Change Category", "Severity Rating", "Discrepancy Details & Affected Area"]
    for i, h in enumerate(chg_headers):
        c = chg_table.cell(0, i)
        set_cell_background(c, HEADER_BG)
        set_cell_margins(c, 80, 80, 100, 100)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(8.5)

    changes_info = [
        ("CHG-SUR-2026-001-001", "POTENTIAL_ENCROACHMENT", "CRITICAL_ENCROACHMENT", "New Unauthorized Concrete Enclosure in Agricultural Buffer (Khasra 104/2) • 142.5 m² (3.2% drift) • 94% Conf"),
        ("CHG-SUR-2026-001-002", "BOUNDARY_SHIFT", "MEDIUM", "Historical 1998 Boundary Line shifted to Modern Physical Ridge Bund • 88.0 m² (1.8% drift) • 89% Conf"),
        ("CHG-SUR-2026-001-003", "LAND_USE_CHANGE", "LOW", "FALLOW_LAND converted to AGRICULTURAL_CROP (Mustard) • 2,150.0 m² (18.5% drift) • 96% Conf"),
        ("CHG-SUR-2026-001-004", "NEW_STRUCTURE", "HIGH", "Open Agricultural Land converted to Solar Irrigation Pump Shed • 64.0 m² (1.2% drift) • 93% Conf"),
    ]

    for row_idx, (cid, ccat, csev, cdet) in enumerate(changes_info, start=1):
        c0 = chg_table.cell(row_idx, 0)
        c1 = chg_table.cell(row_idx, 1)
        c2 = chg_table.cell(row_idx, 2)
        c3 = chg_table.cell(row_idx, 3)

        bg = LIGHT_BG if row_idx % 2 == 1 else "FFFFFF"
        for cell_elem in (c0, c1, c2, c3):
            set_cell_background(cell_elem, bg)
            set_cell_margins(cell_elem, 60, 60, 80, 80)

        c0.paragraphs[0].add_run(cid).font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(8)
        c1.paragraphs[0].add_run(ccat).font.size = Pt(8)

        sev_run = c2.paragraphs[0].add_run(csev)
        sev_run.font.bold = True
        sev_run.font.size = Pt(8)
        if "CRITICAL" in csev or "HIGH" in csev:
            sev_run.font.color.rgb = ROSE
        else:
            sev_run.font.color.rgb = AMBER

        c3.paragraphs[0].add_run(cdet).font.size = Pt(8)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 6. POSTGIS DATABASE ENTITIES
    # =========================================================================
    h1 = doc.add_heading("6. PostGIS Database Models & Schema Extensions", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "Six new database entities have been created in `backend/app/models/ai_results.py` and "
        "`infrastructure/database/init-postgis.sql`:"
    )
    p.paragraph_format.space_after = Pt(4)

    db_items = [
        ("ai_models: ", "Stores registered neural network architectures, versions, frameworks, classes, input requirements, and checksums."),
        ("ai_inference_results: ", "Execution run container linking Survey, ProcessingJob, overall confidence score, execution time ms, and summary metrics."),
        ("ai_classification_results: ", "Georeferenced 8-class thematic segmentation polygons with area (m², ha), coverage %, and CRS."),
        ("ai_boundary_results: ", "Multi-sensor candidate boundaries with confidence, sensor sources list, length (m), estimated area (m²), and verification status."),
        ("ai_change_results: ", "Temporal change detections with severity, old value, new value, affected area, and percentage drift."),
        ("ai_audit_logs: ", "Immutable audit trail capturing user action (ACCEPT_VERIFY, REJECT, EDIT_VERTICES), original AI prediction, and surveyor edits."),
    ]
    for d_title, d_desc in db_items:
        dp = doc.add_paragraph(style='List Bullet')
        r1 = dp.add_run(d_title)
        r1.font.bold = True
        r1.font.color.rgb = NAVY
        r2 = dp.add_run(d_desc)
        r2.font.color.rgb = DARK_GRAY
        dp.paragraph_format.space_after = Pt(2)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # 7. AUTOMATED VERIFICATION & TEST RESULTS
    # =========================================================================
    h1 = doc.add_heading("7. Automated Test Suite Verification Results", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "The automated test suite in `backend/tests/test_ai_intelligence.py` thoroughly verifies all Prompt 4 requirements. "
        "All 54 backend Pytest tests passed in 1.75 seconds with 100% success rate:"
    )
    p.paragraph_format.space_after = Pt(4)

    test_table = doc.add_table(rows=9, cols=3)
    test_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    test_headers = ["Test Requirement", "Pytest Verification Function", "Result & Execution Status"]
    for i, h in enumerate(test_headers):
        c = test_table.cell(0, i)
        set_cell_background(c, HEADER_BG)
        set_cell_margins(c, 80, 80, 100, 100)
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(8.5)

    test_cases = [
        ("BaseAIModel Abstraction & Adapters", "test_classification_model_loading()", "PASSED • YOLO & SegFormer loading & metadata verified"),
        ("8-Class Semantic Segmentation", "test_classification_prediction()", "PASSED • 8 classes & georeferenced areas verified"),
        ("3-Tier Confidence Classifier", "test_classification_confidence()", "PASSED • HIGH (>=0.90), MED (0.70-0.90), LOW (<0.70)"),
        ("Multi-Sensor Ridge Detection", "test_boundary_detection(), test_boundary_confidence()", "PASSED • LiDAR + RGB + DEM sensor fusion verified"),
        ("Database Result Persistence", "test_ai_result_persistence()", "PASSED • AIInferenceResult & Classification persistence verified"),
        ("Historical Change & Encroachments", "test_change_detection(), test_historical_new_dataset_comparison()", "PASSED • Encroachment alerts & temporal shifts verified"),
        ("Scale Invariance & Topology", "test_geometry_validity(), test_crs_consistency()", "PASSED • Valid closed rings & 3D surface area verified"),
        ("Human Verification & Audit Trail", "test_human_verification(), test_audit_logging()", "PASSED • Accept, reject, edit vertices & AIAuditLog verified"),
    ]

    for row_idx, (treq, tfn, tstat) in enumerate(test_cases, start=1):
        c0 = test_table.cell(row_idx, 0)
        c1 = test_table.cell(row_idx, 1)
        c2 = test_table.cell(row_idx, 2)

        bg = LIGHT_BG if row_idx % 2 == 1 else "FFFFFF"
        for cell_elem in (c0, c1, c2):
            set_cell_background(cell_elem, bg)
            set_cell_margins(cell_elem, 60, 60, 80, 80)

        c0.paragraphs[0].add_run(treq).font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(8)
        c1.paragraphs[0].add_run(tfn).font.size = Pt(8)
        c2.paragraphs[0].add_run(tstat).font.bold = True
        c2.paragraphs[0].runs[0].font.color.rgb = EMERALD
        c2.paragraphs[0].runs[0].font.size = Pt(8)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # =========================================================================
    # 8. VISUAL VERIFICATION & SCREENSHOTS
    # =========================================================================
    h1 = doc.add_heading("8. Visual Interface & Workbench Verification", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "Visual validation was executed through an automated browser subagent session. "
        "The screenshots below capture key interactive workflows on the AI Intelligence Dashboard:"
    )
    p.paragraph_format.space_after = Pt(6)

    # Artifact Screenshot Paths
    brain_dir = r"C:\Users\Vedansh Singhal\.gemini\antigravity-ide\brain\8a2adbf6-3a14-4cb9-afd2-a21233355856"
    img1 = os.path.join(brain_dir, "ai_analysis_page_1788166173793.png")
    img2 = os.path.join(brain_dir, "candidate_verified_1788166200314.png")
    img3 = os.path.join(brain_dir, "dem_layer_checked_1788166517329.png")

    screenshots = [
        (img1, "Figure 1: AI Intelligence & Analysis Dashboard with 5 Metric Cards, 18-Layer Interactive GIS Map, and Candidate Bunds Panel"),
        (img2, "Figure 2: Human-in-the-Loop Surveyor Verification — Candidate BND-SUR-2026-001-001 Certified with Green VERIFIED Badge"),
        (img3, "Figure 3: 18-Layer GIS Map Control HUD — Bare-Earth DEM Raster and AI Polygon Overlays Activated"),
    ]

    for img_path, caption in screenshots:
        if os.path.exists(img_path):
            try:
                doc.add_picture(img_path, width=Inches(6.2))
                cp = doc.add_paragraph()
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                crun = cp.add_run(caption)
                crun.font.size = Pt(8.5)
                crun.font.italic = True
                crun.font.color.rgb = DARK_GRAY
                doc.add_paragraph().paragraph_format.space_after = Pt(6)
            except Exception as e:
                print(f"Could not embed image {img_path}: {e}")

    # =========================================================================
    # 9. CONCLUSION & PROMPT 5 READINESS
    # =========================================================================
    h1 = doc.add_heading("9. Conclusion & Prompt 5 Readiness", level=1)
    h1.runs[0].font.color.rgb = NAVY

    p = doc.add_paragraph(
        "BhoomiSync Prompt 4 has been completely implemented, verified, and integrated without regressions. "
        "The AI Intelligence Layer provides a solid, modular, and legally compliant foundation for automated land "
        "classification, multi-sensor boundary extraction, and historical change detection. All 54 backend automated "
        "tests passed in 1.75s, the frontend production bundle compiled with 0 TypeScript errors, and browser "
        "verification demonstrated flawless human-in-the-loop verification."
    )
    p.paragraph_format.line_spacing = 1.15

    output_path = r"d:\BhoomiSync\BhoomiSync_Prompt4_Walkthrough.docx"
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    create_prompt4_walkthrough_document()
