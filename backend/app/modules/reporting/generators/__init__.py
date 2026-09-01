from app.modules.reporting.generators.base_generator import BaseReportGenerator
from app.modules.reporting.generators.pdf_generator import PDFReportGenerator
from app.modules.reporting.generators.geojson_generator import GeoJSONReportGenerator
from app.modules.reporting.generators.kml_generator import KMLReportGenerator
from app.modules.reporting.generators.csv_generator import CSVReportGenerator
from app.modules.reporting.generators.json_generator import JSONReportGenerator

GENERATORS_MAP = {
    "PDF": PDFReportGenerator,
    "GEOJSON": GeoJSONReportGenerator,
    "KML": KMLReportGenerator,
    "CSV": CSVReportGenerator,
    "JSON": JSONReportGenerator,
}

__all__ = [
    "BaseReportGenerator",
    "PDFReportGenerator",
    "GeoJSONReportGenerator",
    "KMLReportGenerator",
    "CSVReportGenerator",
    "JSONReportGenerator",
    "GENERATORS_MAP",
]
