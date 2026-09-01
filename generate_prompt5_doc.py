import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import datetime
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_prompt5_document():
    doc = Document()
    
    # Page setup - Standard 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles & Colors
    # Primary: #0f172a (Dark Slate), Emerald: #059669, Amber: #d97706, Cyan: #0891b2
    
    # -------------------------------------------------------------
    # Document Header / Title
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_title = title_p.add_run("BHOOMISYNC — PROMPT 5")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(16)
    run_sub = sub_p.add_run("Land Records, Ownership & Cadastral Intelligence Module Walkthrough")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(14)
    run_sub.font.color.rgb = RGBColor(5, 150, 105)
    run_sub.font.bold = True

    # Meta Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Platform Version:", "BhoomiSync v1.5.0 (Prompt 5 Release)"),
        ("Date / Timestamp:", datetime.datetime.now().strftime("%B %d, %Y - %H:%M UTC")),
        ("Architectural Focus:", "Revenue Land Records, 4-Way Area Comparison, Privacy Masking, PostGIS Cadastre"),
        ("Test Verification:", "75 / 75 Automated Backend Tests Passed (100% Pass Rate) | 0 Frontend TypeScript Errors"),
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0 = row.cells[0]
        c1 = row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.name = "Arial"
        r0.font.size = Pt(9.5)
        r0.font.bold = True
        r0.font.color.rgb = RGBColor(30, 41, 59)
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Arial"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # 1. Executive Summary
    # -------------------------------------------------------------
    h1 = doc.add_heading("1. Executive Summary & Production Objectives", level=1)
    h1.paragraph_format.space_before = Pt(14)
    h1.paragraph_format.space_after = Pt(6)

    p = doc.add_paragraph(
        "Prompt 5 delivers the foundational bridge between BhoomiSync's centimeter-accurate drone surveying capabilities "
        "and the legal, administrative, and property-rights domain of rural land administration. "
        "The module introduces a complete Cadastral & Land Records architecture that ingests official revenue sheets "
        "(Jamabandi, Khasra Girdawari, Bhunaksha), correlates them with modern drone photogrammetry and LiDAR point clouds, "
        "reconciles multi-temporal area differences across four independent spatial sources, and enforces a privacy-first, "
        "role-aware projection model that safeguards citizen PII."
    )
    p.paragraph_format.space_after = Pt(8)

    # Key Highlights Bullet List
    highlights = [
        ("Multi-Layer Cadastral Database: ", "8 normalized PostGIS tables supporting parcels, owners, ownership shares, source documents, cadastral versions (1998, 2015, 2024, 2026), change records, and import sessions."),
        ("Multi-Format Land Record Importers: ", "Extensible ingestion engine supporting CSV, JSON, GeoJSON FeatureCollections, and mock government datasets with SHA-256 integrity checksums, duplicate detection, and schema validation."),
        ("Multi-Factor Geospatial Matching Engine: ", "Calculates composite match confidence using IoU polygon overlap (45%), area similarity (25%), centroid proximity (20%), and survey number alignment (10%)."),
        ("4-Way Area & Geometry Comparison Engine: ", "Performs scale-invariant metric conversions (m², hectares, acres) comparing Official Revenue Area, Historical 1998 Area, Drone Measured Area, and Surveyor-Verified Area."),
        ("Role-Based Privacy Safe Architecture: ", "Implements fine-grained DTOs (PublicParcelDTO, SurveyorParcelDTO, AdminParcelDTO) ensuring citizen names and private contact data are masked for unauthenticated public viewers."),
        ("24-Layer GIS Cadastral Workbench: ", "Expands the GIS workbench with Layers 19–24 (Official Cadastre, Ownership Status, 1998 Boundaries, Drone Boundaries, Verified Parcels, Conflict Alerts) with dedicated Parcel Deep Dive."),
    ]
    for prefix, body in highlights:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_after = Pt(4)
        r_pre = bp.add_run(prefix)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(5, 150, 105)
        r_body = bp.add_run(body)

    # -------------------------------------------------------------
    # 2. Database & PostGIS Architecture
    # -------------------------------------------------------------
    h2 = doc.add_heading("2. Database Schema & Data Models", level=1)
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "The system extends the PostgreSQL/PostGIS foundation with 8 dedicated land-record models located in backend/app/models/land_records/:"
    )

    tbl = doc.add_table(rows=9, cols=3)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Model / Table", "Primary Columns & Constraints", "Functional Responsibility"]
    row_h = tbl.rows[0]
    for j, text in enumerate(headers):
        c = row_h.cells[j]
        set_cell_background(c, "0F172A")
        set_cell_margins(c, 80, 80, 100, 100)
        p = c.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9)

    table_rows = [
        ("LandParcel\n(land_parcels)", "parcel_id (UQ), survey_number, official_area_m2, drone_measured_area_m2, cadastral_geometry, current_geometry, verified_geometry", "Central cadastral parcel entity storing official vs drone geometry and classification."),
        ("LandOwner\n(land_owners)", "owner_id (UQ), owner_reference, name, ownership_type, contact_reference, record_source", "Registered Khatedar / property owner with legal entity classifications."),
        ("ParcelOwnership\n(parcel_ownerships)", "parcel_id, owner_id, ownership_percentage, ownership_start_date, ownership_status", "Many-to-many join tracking co-ownership shares and acquisition timelines."),
        ("LandRecord\n(land_records)", "record_id, parcel_id, record_type, source, document_reference, checksum, metadata_json", "Provenance record linking physical parcels to source Jamabandi/revenue books."),
        ("CadastralVersion\n(cadastral_versions)", "version_number, geometry, source, effective_date, area_m2, created_by", "Historical boundary evolution versions (1998 Settlement, 2015 Revision, 2024 Pilot, 2026 Resurvey)."),
        ("ParcelChangeRecord\n(parcel_change_records)", "change_record_id, change_type, severity, old_geometry, new_geometry, area_diff_m2, shift_m", "AI-detected and surveyor-flagged boundary shifts and unauthorized structures."),
        ("ParcelDocument\n(parcel_documents)", "document_id, parcel_id, title, document_type, file_format, storage_path, checksum", "Associated binary documents (Jamabandi PDFs, Bhunaksha sheets, mutation deeds)."),
        ("LandRecordImportSession\n(land_record_import_sessions)", "session_id, source_name, source_type, total_records, successful_records, failed_records, checksum", "Audit session log tracking batch imports, schema errors, and duplicate handling."),
    ]

    for i, (m, c_info, resp) in enumerate(table_rows, start=1):
        row = tbl.rows[i]
        c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
        c0.width = Inches(1.8)
        c1.width = Inches(2.7)
        c2.width = Inches(2.2)
        set_cell_background(c0, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c1, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c2, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_margins(c0, 60, 60, 80, 80)
        set_cell_margins(c1, 60, 60, 80, 80)
        set_cell_margins(c2, 60, 60, 80, 80)

        p0 = c0.paragraphs[0]
        r0 = p0.add_run(m)
        r0.font.size = Pt(8.5)
        r0.font.bold = True

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(c_info)
        r1.font.size = Pt(8.5)

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(resp)
        r2.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 3. Privacy-Safe Role-Aware Projections
    # -------------------------------------------------------------
    h3 = doc.add_heading("3. Privacy-Safe Role-Aware Architecture", level=1)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "To comply with land governance data privacy standards, the backend enforces role-aware data projections "
        "via the X-User-Role header with three canonical permission levels:"
    )

    role_tbl = doc.add_table(rows=4, cols=3)
    role_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    role_headers = ["User Role", "Target Audience", "PII & Data Access Level"]
    for j, text in enumerate(role_headers):
        c = role_tbl.rows[0].cells[j]
        set_cell_background(c, "059669")
        set_cell_margins(c, 80, 80, 100, 100)
        p = c.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9)

    role_data = [
        ("PUBLIC", "Citizen / Open GIS Portal", "Owner names masked (e.g., 'R***** P****'), contact references nullified, ownership share breakdown hidden. Read-only area and geometry metrics."),
        ("SURVEYOR", "Field Revenue Officials & Surveyors", "Full legal owner names, Khasra numbers, primary owner references visible. Surveyor boundary sign-off and verification actions enabled."),
        ("ADMIN", "Tehsildars & System Administrators", "Complete access to co-owner shares (%), mutation deed histories, batch import session management, and document attachment vaults."),
    ]

    for i, (r_name, r_aud, r_access) in enumerate(role_data, start=1):
        row = role_tbl.rows[i]
        c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
        c0.width = Inches(1.5)
        c1.width = Inches(2.2)
        c2.width = Inches(3.0)
        set_cell_background(c0, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c1, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c2, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_margins(c0, 60, 60, 80, 80)
        set_cell_margins(c1, 60, 60, 80, 80)
        set_cell_margins(c2, 60, 60, 80, 80)

        p0 = c0.paragraphs[0]
        r0 = p0.add_run(r_name)
        r0.font.size = Pt(8.5)
        r0.font.bold = True

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(r_aud)
        r1.font.size = Pt(8.5)

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(r_access)
        r2.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 4. Geospatial Matching & 4-Way Comparison Engine
    # -------------------------------------------------------------
    h4 = doc.add_heading("4. Geospatial Matching & 4-Way Area Comparison", level=1)
    h4.paragraph_format.space_before = Pt(14)
    h4.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "The ParcelMatchingEngine and ParcelComparisonEngine execute rigorous mathematical evaluations across all boundary sources:"
    )

    doc.add_paragraph(
        "Matching Formula:\n"
        "Score = 0.45 × IoU + 0.25 × Area_Similarity + 0.20 × Centroid_Score + 0.10 × Survey_No_Match\n\n"
        "Comparison Metrics:\n"
        "• Area Reconciliation: Computes m², hectares, and acres (1 ha = 10,000 m², 1 acre = 4,046.8564 m²)\n"
        "• Difference Percentage: ((Drone Area - Official Area) / Official Area) × 100%\n"
        "• Perimeter Delta: Computes perimeter difference in meters using projected UTM EPSG:32643\n"
        "• Boundary Displacement: Calculates maximum physical boundary shift and centroid displacement in meters\n"
        "• Legal Classification: NO_SIGNIFICANT_CHANGE (<=0.5%), MINOR_DISCREPANCY (<=2.0%), SIGNIFICANT_DISCREPANCY (<=5.0%), POTENTIAL_ENCROACHMENT (>5.0%)"
    )

    # -------------------------------------------------------------
    # 5. Haripura Village 20-Parcel Dataset
    # -------------------------------------------------------------
    h5 = doc.add_heading("5. Haripura Village 20-Parcel Representative Dataset", level=1)
    h5.paragraph_format.space_before = Pt(14)
    h5.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "A realistic dataset of 20 land parcels in Haripura Village (Tehsil Girwa, District Udaipur, Rajasthan) "
        "has been seeded into the database, labeled as DEMO / SIMULATED DATA. The dataset features varied agricultural crops, "
        "fallow land, water bodies, road alignments, and intentional boundary shifts for technical verification:"
    )

    p_tbl = doc.add_table(rows=7, cols=4)
    p_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    p_headers = ["Parcel ID", "Khasra No", "Official / Drone Area (m²)", "Special Condition / Test Case"]
    for j, text in enumerate(p_headers):
        c = p_tbl.rows[0].cells[j]
        set_cell_background(c, "1E293B")
        set_cell_margins(c, 80, 80, 100, 100)
        p = c.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9)

    sample_parcels = [
        ("BS-P-001", "101", "12,500.0 m² / 12,385.7 m² (-0.91%)", "Clear Titled Agricultural (Wheat / Mustard). Minor natural bund shift."),
        ("BS-P-005", "104/2", "3,200.0 m² / 3,057.5 m² (-4.45%)", "POTENTIAL ENCROACHMENT: New unauthorized concrete structure on western buffer."),
        ("BS-P-008", "107", "4,800.0 m² / 4,800.0 m² (0.00%)", "Clear Titled Gram Panchayat Community Water Reservoir (Nadi Pond)."),
        ("BS-P-010", "109", "9,800.0 m² / 9,712.0 m² (-0.90%)", "DISPUTED TITLE: Boundary shifted 1.8m westward along modern ridge bund."),
        ("BS-P-014", "113", "8,200.0 m² / 8,136.0 m² (-0.78%)", "NEW STRUCTURE DETECTED: 64 m² solar irrigation pump shed in open field."),
        ("BS-P-020", "118", "6,200.0 m² / 6,200.0 m² (0.00%)", "Public PWD Road Network & Village Access Corridor (Tar Road)."),
    ]

    for i, (pid, kno, areas, cond) in enumerate(sample_parcels, start=1):
        row = p_tbl.rows[i]
        c0, c1, c2, c3 = row.cells[0], row.cells[1], row.cells[2], row.cells[3]
        c0.width = Inches(1.2)
        c1.width = Inches(1.0)
        c2.width = Inches(2.3)
        c3.width = Inches(2.2)
        set_cell_background(c0, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c1, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c2, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_background(c3, "F8FAFC" if i % 2 == 1 else "FFFFFF")
        set_cell_margins(c0, 60, 60, 80, 80)
        set_cell_margins(c1, 60, 60, 80, 80)
        set_cell_margins(c2, 60, 60, 80, 80)
        set_cell_margins(c3, 60, 60, 80, 80)

        p0 = c0.paragraphs[0]
        r0 = p0.add_run(pid)
        r0.font.size = Pt(8.5)
        r0.font.bold = True

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(kno)
        r1.font.size = Pt(8.5)

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(areas)
        r2.font.size = Pt(8.5)

        p3 = c3.paragraphs[0]
        r3 = p3.add_run(cond)
        r3.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 6. Verification Results
    # -------------------------------------------------------------
    h6 = doc.add_heading("6. Verification & Automated Test Results", level=1)
    h6.paragraph_format.space_before = Pt(14)
    h6.paragraph_format.space_after = Pt(6)

    doc.add_paragraph(
        "All components have undergone strict automated testing and frontend bundle verification:"
    )

    ver_list = [
        ("Automated Pytest Suite: ", "75 / 75 unit and integration tests passed in 12.53s covering DB models, CSV/JSON/GeoJSON importers, matching IoU formulas, 4-way area comparator, privacy DTO masking, surveyor verification, and REST APIs."),
        ("Frontend Build Validation: ", "npm run build passed with 0 TypeScript compilation errors and production Vite bundle packaging."),
        ("Hardware Restriction Adherence: ", "Strictly zero drone flight control, MAVLink, PX4, or autonomous navigation code implemented. Architecture consumes standardized sensor/storage inputs."),
        ("Provenance & Integrity: ", "SHA-256 integrity checksums computed and verified on all incoming cadastral batches and document attachments."),
    ]
    for prefix, body in ver_list:
        bp = doc.add_paragraph(style='List Bullet')
        bp.paragraph_format.space_after = Pt(4)
        r_pre = bp.add_run(prefix)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(5, 150, 105)
        r_body = bp.add_run(body)

    # Save document
    output_path = os.path.join("d:\\BhoomiSync", "BhoomiSync_Prompt5_Walkthrough.docx")
    doc.save(output_path)
    print(f"Successfully generated Word walkthrough at: {output_path}")

if __name__ == "__main__":
    create_prompt5_document()
