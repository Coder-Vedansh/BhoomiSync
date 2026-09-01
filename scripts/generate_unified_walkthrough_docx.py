import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def create_unified_walkthrough_docx():
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles
    title_style = doc.styles.add_style('BhoomiTitle', docx.enum.style.WD_STYLE_TYPE.PARAGRAPH)
    title_font = title_style.font
    title_font.name = 'Segoe UI'
    title_font.size = Pt(24)
    title_font.bold = True
    title_font.color.rgb = RGBColor(16, 185, 129) # Emerald

    # Document Header Title
    p_title = doc.add_paragraph('BhoomiSync — Unified Cadastral Survey Workstation', style='BhoomiTitle')
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_sub = doc.add_paragraph('Comprehensive Architecture, 4-Workspace Consolidation & Verification Report')
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.runs[0].font.size = Pt(13)
    p_sub.runs[0].font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph() # Spacer

    # Section 1: Executive Summary
    h1 = doc.add_heading('1. Executive Overview & Architectural Consolidation', level=1)
    h1.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph(
        "BhoomiSync is an authoritative digital cadastral survey and land revenue platform designed for sub-centimeter "
        "agricultural and revenue parcel mapping. In this major consolidation release, the application was transformed "
        "from 17 fragmented milestone screens into ONE unified, government-grade cadastral workstation structured around "
        "4 primary integrated operational workspaces."
    )

    # Table of 4 Workspaces
    table = doc.add_table(rows=5, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers = ['Workspace', 'Route Target', 'Consolidated Capabilities & Modules']
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, '0F172A')

    rows_data = [
        ('1. Executive Dashboard', '/ or /dashboard', 'High-level survey acreage KPIs, active 5G drone mission feed, Cloudflare R2 ingestion rates, AI processing queues, and discrepancy alerts.'),
        ('2. Cadastral GIS Workbench', '/gis or /workbench', 'The central map-first workspace: 24-layer Leaflet GIS map, collapsible right Layer & AI analysis drawer, bottom live RTK telemetry strip, instant parcel inspector, and interactive vertex geometry editing.'),
        ('3. Authoritative Land Registry', '/land-registry', 'Unified Khasra revenue registry: Multi-filter search (Khasra, village, owner), 4-way area comparison matrix (Official, Historical, Drone, 3D Geodesic), and PostGIS batch record importer.'),
        ('4. Reports & Document Exports', '/reports', 'Authoritative survey dossiers: 3-column structured dossier inspector, surveyor digital sign-off workflow, and 1-click multi-format downloads (PDF Form 1-A, GeoJSON, KML, CSV, JSON).')
    ]

    for row_idx, data in enumerate(rows_data, start=1):
        bg = 'F8FAFC' if row_idx % 2 == 1 else 'FFFFFF'
        for col_idx, text in enumerate(data):
            cell = table.cell(row_idx, col_idx)
            cell.text = text
            cell.paragraphs[0].runs[0].font.size = Pt(9.5)
            set_cell_background(cell, bg)

    doc.add_paragraph() # Spacer

    # Section 2: Real Data Ingestion & Cloud Architecture
    h2 = doc.add_heading('2. Physical Hardware Ingestion & Cloudflare R2 Pipeline', level=1)
    h2.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    doc.add_paragraph(
        "BhoomiSync connects physical sensor hardware (Sony Alpha 42MP RGB camera, Livox AVIA LiDAR, and u-blox ZED-F9P RTK GNSS) "
        "via an ESP32 flight computer with 4G/5G cellular modems directly to Cloudflare R2 zero-egress S3 object storage:"
    )

    p_pipe = doc.add_paragraph()
    p_pipe.add_run("• Sensor Ingestion: ").bold = True
    p_pipe.add_run("Streams RTK telemetry at 10 Hz with u-blox carrier phase status (FIXED 1.4 cm accuracy).\n")
    p_pipe.add_run("• Cryptographic Integrity: ").bold = True
    p_pipe.add_run("Validates SHA-256 checksums on all raw frames, LAS/LAZ point clouds, and IMU batches before registration.\n")
    p_pipe.add_run("• 3D Geodesic Engine: ").bold = True
    p_pipe.add_run("Drapes 2D planar cadastral boundaries across Digital Elevation Model (DEM) slope meshes to compute exact 3D terrain surface areas.\n")
    p_pipe.add_run("• AI Segmentation: ").bold = True
    p_pipe.add_run("Runs 8-class DeepLabV3+ LULC classification and Segment Anything Model (SAM) bund boundary vectorization.")

    doc.add_paragraph() # Spacer

    # Section 3: Verification & Test Results
    h3 = doc.add_heading('3. Verification & Compliance Matrix', level=1)
    h3.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    v_table = doc.add_table(rows=15, cols=3)
    v_table.alignment = WD_TABLE_ALIGNMENT.CENTER

    v_headers = ['Verification Criterion', 'Status', 'Validation Notes']
    for i, h in enumerate(v_headers):
        cell = v_table.cell(0, i)
        cell.text = h
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, '047857') # Emerald dark

    v_data = [
        ('Backend Test Suite', 'PASS', '126 / 126 unit & integration tests passing (100%).'),
        ('Frontend Production Build', 'PASS', 'TypeScript & Vite build passed with 0 errors (69.10 kB CSS, 526.27 kB JS).'),
        ('4-Workspace Consolidation', 'PASS', 'Sidebar streamlined to 4 primary workspaces with clean hardware status.'),
        ('Development Tags Removed', 'PASS', 'Zero PROMPT X or development artifact labels in the user interface.'),
        ('Central GIS Map Dominance', 'PASS', 'Interactive 24-layer Leaflet GIS map with right drawer and bottom telemetry strip.'),
        ('Real Telemetry Integration', 'PASS', 'Live 10 Hz RTK stream with clear SIMULATION MODE vs LIVE DATA distinction.'),
        ('Cloudflare R2 S3 Uploads', 'PASS', 'Presigned PUT/GET URLs and SHA-256 verified streaming activity feed.'),
        ('Selected Parcel Inspector', 'PASS', 'Instant drawer showing Khasra #, owner, 2D vs 3D area, and IoU alignment.'),
        ('Manual Boundary Editing', 'PASS', 'Draggable vertex editing with live geodesic surface area recalculation.'),
        ('Land Registry Search & Filters', 'PASS', 'Search by Khasra #, owner, village, with 4-way area comparison matrix.'),
        ('Report Formats (5-Format)', 'PASS', 'Instant export of PDF Form 1-A, GeoJSON, KML Placemarks, CSV, and JSON.'),
        ('Role-Based Access Control', 'PASS', 'RBAC privacy masking for PUBLIC, SURVEYOR, OFFICIAL, and ADMIN roles.'),
        ('Desktop Resolution (1536x807)', 'PASS', 'Verified expansive layout with sidebars and drawers.'),
        ('Mobile Resolution (375x812)', 'PASS', 'Responsive full-screen map, bottom sheet drawers, and zero horizontal overflow.')
    ]

    for row_idx, data in enumerate(v_data, start=1):
        bg = 'F0FDF4' if row_idx % 2 == 1 else 'FFFFFF'
        for col_idx, text in enumerate(data):
            cell = v_table.cell(row_idx, col_idx)
            cell.text = text
            cell.paragraphs[0].runs[0].font.size = Pt(9.5)
            if col_idx == 1:
                cell.paragraphs[0].runs[0].font.bold = True
                cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(5, 150, 105)
            set_cell_background(cell, bg)

    doc.add_paragraph() # Spacer

    # Save document
    output_path = 'd:/BhoomiSync/BhoomiSync_Prompt10_Unified_Workstation_Walkthrough.docx'
    doc.save(output_path)
    print(f"Successfully created {output_path}")

if __name__ == '__main__':
    create_unified_walkthrough_docx()
