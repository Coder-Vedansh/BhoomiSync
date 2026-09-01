from typing import Dict, Any, List
from app.modules.reporting.generators.base_generator import BaseReportGenerator


class KMLReportGenerator(BaseReportGenerator):
    """
    Standard OpenGIS KML (Keyhole Markup Language) Exporter.
    Generates structured KML with styling, folders, and polygons for Google Earth and QGIS.
    """

    def __init__(self):
        super().__init__(
            format_name="KML",
            mime_type="application/vnd.google-earth.kml+xml",
            file_extension="kml",
        )

    def _coords_to_kml_string(self, coords: List[List[float]]) -> str:
        """Converts GeoJSON [[lon, lat], ...] to KML 'lon,lat,0 lon,lat,0'"""
        points = []
        for c in coords:
            points.append(f"{c[0]},{c[1]},0")
        return " ".join(points)

    def generate(self, snapshot: Dict[str, Any], **kwargs) -> bytes:
        meta = snapshot.get("snapshot_metadata", {})
        parcel_info = snapshot.get("parcel_and_location", {})
        measurements = snapshot.get("geospatial_measurements", {})
        boundary_data = snapshot.get("boundary_analysis", {}).get("geometries", {})
        surveyor_data = snapshot.get("surveyor_verification", {})

        doc_name = f"BhoomiSync Survey - Khasra {parcel_info.get('khasra_number', '101')} ({parcel_info.get('village', 'Haripura')})"
        
        kml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<kml xmlns="http://www.opengis.net/kml/2.2">',
            '  <Document>',
            f'    <name>{doc_name}</name>',
            f'    <description>BhoomiSync Digital Land Survey Report Export - {meta.get("survey_code")}</description>',
            '',
            '    <!-- Styles -->',
            '    <Style id="officialBoundaryStyle">',
            '      <LineStyle><color>fffa823b</color><width>2</width></LineStyle>',
            '      <PolyStyle><color>4d8a3a1e</color></PolyStyle>',
            '    </Style>',
            '    <Style id="historicalBoundaryStyle">',
            '      <LineStyle><color>fff755a8</color><width>1.5</width></LineStyle>',
            '      <PolyStyle><color>4d64073b</color></PolyStyle>',
            '    </Style>',
            '    <Style id="droneBoundaryStyle">',
            '      <LineStyle><color>ff47e0fd</color><width>2</width></LineStyle>',
            '      <PolyStyle><color>4d0f3578</color></PolyStyle>',
            '    </Style>',
            '    <Style id="verifiedBoundaryStyle">',
            '      <LineStyle><color>ff99d334</color><width>3</width></LineStyle>',
            '      <PolyStyle><color>663b4e06</color></PolyStyle>',
            '    </Style>',
            '',
        ]

        # Official Boundary Folder
        if boundary_data.get("official_boundary"):
            coords_raw = boundary_data["official_boundary"].get("coordinates", [[]])[0]
            kml_coords = self._coords_to_kml_string(coords_raw)
            kml_lines.extend([
                '    <Folder>',
                '      <name>Official Revenue Cadastre</name>',
                '      <Placemark>',
                f'        <name>Official Boundary - Khasra #{parcel_info.get("khasra_number")}</name>',
                f'        <description>Area: {measurements.get("official_area_m2"):,.2f} m² | Source: Jamabandi Record</description>',
                '        <styleUrl>#officialBoundaryStyle</styleUrl>',
                '        <Polygon>',
                '          <outerBoundaryIs>',
                '            <LinearRing>',
                f'              <coordinates>{kml_coords}</coordinates>',
                '            </LinearRing>',
                '          </outerBoundaryIs>',
                '        </Polygon>',
                '      </Placemark>',
                '    </Folder>',
            ])

        # Historical Boundary Folder
        if boundary_data.get("historical_boundary"):
            coords_raw = boundary_data["historical_boundary"].get("coordinates", [[]])[0]
            kml_coords = self._coords_to_kml_string(coords_raw)
            kml_lines.extend([
                '    <Folder>',
                '      <name>Historical Cadastre Baseline (2021)</name>',
                '      <Placemark>',
                f'        <name>Historical Boundary (2021) - Khasra #{parcel_info.get("khasra_number")}</name>',
                f'        <description>Area: {measurements.get("historical_area_m2"):,.2f} m²</description>',
                '        <styleUrl>#historicalBoundaryStyle</styleUrl>',
                '        <Polygon>',
                '          <outerBoundaryIs>',
                '            <LinearRing>',
                f'              <coordinates>{kml_coords}</coordinates>',
                '            </LinearRing>',
                '          </outerBoundaryIs>',
                '        </Polygon>',
                '      </Placemark>',
                '    </Folder>',
            ])

        # Drone Detected Boundary Folder
        if boundary_data.get("drone_boundary"):
            coords_raw = boundary_data["drone_boundary"].get("coordinates", [[]])[0]
            kml_coords = self._coords_to_kml_string(coords_raw)
            kml_lines.extend([
                '    <Folder>',
                '      <name>Drone AI Detected Boundary</name>',
                '      <Placemark>',
                f'        <name>Drone Detected Boundary - Khasra #{parcel_info.get("khasra_number")}</name>',
                f'        <description>Planar Area: {measurements.get("planar_area_m2"):,.2f} m² | 3D Surface: {measurements.get("surface_area_m2"):,.2f} m²</description>',
                '        <styleUrl>#droneBoundaryStyle</styleUrl>',
                '        <Polygon>',
                '          <outerBoundaryIs>',
                '            <LinearRing>',
                f'              <coordinates>{kml_coords}</coordinates>',
                '            </LinearRing>',
                '          </outerBoundaryIs>',
                '        </Polygon>',
                '      </Placemark>',
                '    </Folder>',
            ])

        # Surveyor Verified Boundary Folder
        if boundary_data.get("verified_boundary"):
            coords_raw = boundary_data["verified_boundary"].get("coordinates", [[]])[0]
            kml_coords = self._coords_to_kml_string(coords_raw)
            kml_lines.extend([
                '    <Folder>',
                '      <name>Surveyor Verified Boundary</name>',
                '      <Placemark>',
                f'        <name>Verified Boundary - Khasra #{parcel_info.get("khasra_number")}</name>',
                f'        <description>Verified Area: {measurements.get("verified_area_m2"):,.2f} m² | Surveyor: {surveyor_data.get("surveyor_name")}</description>',
                '        <styleUrl>#verifiedBoundaryStyle</styleUrl>',
                '        <Polygon>',
                '          <outerBoundaryIs>',
                '            <LinearRing>',
                f'              <coordinates>{kml_coords}</coordinates>',
                '            </LinearRing>',
                '          </outerBoundaryIs>',
                '        </Polygon>',
                '      </Placemark>',
                '    </Folder>',
            ])

        # Centroid Placemark
        if parcel_info.get("centroid_latitude") and parcel_info.get("centroid_longitude"):
            kml_lines.extend([
                '    <Folder>',
                '      <name>Parcel Information Point</name>',
                '      <Placemark>',
                f'        <name>Khasra #{parcel_info.get("khasra_number")}</name>',
                f'        <description>Village: {parcel_info.get("village")} | Land Use: {parcel_info.get("land_use")}</description>',
                '        <Point>',
                f'          <coordinates>{parcel_info["centroid_longitude"]},{parcel_info["centroid_latitude"]},0</coordinates>',
                '        </Point>',
                '      </Placemark>',
                '    </Folder>',
            ])

        kml_lines.extend([
            '  </Document>',
            '</kml>',
        ])

        return "\n".join(kml_lines).encode("utf-8")
