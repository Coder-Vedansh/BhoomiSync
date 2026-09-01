import pytest
import math
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db.seed import seed_mock_data
from app.modules.geospatial_processing.measurement.measurement_engine import MeasurementEngine
from app.modules.geospatial_processing.georeferencing.georeferencer import Georeferencer
from app.modules.geospatial_processing.image_processing.image_processor import ImageProcessor
from app.modules.geospatial_processing.lidar_processing.lidar_processor import LidarProcessor
from app.modules.geospatial_processing.gnss_processing.gnss_processor import GnssProcessor
from app.modules.geospatial_processing.fusion.fusion_engine import FusionEngine
from app.modules.geospatial_processing.orthomosaic.orthomosaic_generator import OrthomosaicGenerator
from app.modules.geospatial_processing.terrain.terrain_modeler import TerrainModeler
from app.modules.geospatial_processing.boundary.boundary_detector import BoundaryDetector

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_mock_data(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==============================================================================
# UNIT TESTS: GEODETIC MATH & SCALE INVARIANCE
# ==============================================================================

def test_measurement_planar_vs_terrain_surface_area():
    """
    Validates horizontal planar area vs 3D slope-aware surface area on WGS84.
    Surface Area must be strictly >= Planar Area, and scale-invariance must be guaranteed.
    """
    # 200m x 200m square polygon in Haripura, Rajasthan (~40,000 m²)
    coords = [
        [73.7110, 24.5845],
        [73.7130, 24.5845],
        [73.7130, 24.5865],
        [73.7110, 24.5865],
        [73.7110, 24.5845],
    ]

    planar_m2 = MeasurementEngine.calculate_planar_area(coords)
    assert planar_m2 > 20000.0
    assert planar_m2 < 30000.0

    # Flat ground (slope = 0°) -> Surface Area == Planar Area
    flat_surface_m2 = MeasurementEngine.calculate_terrain_surface_area(planar_m2, slope_deg=0.0)
    assert flat_surface_m2 == planar_m2

    # Sloped agricultural terrain (slope = 8.5°) -> Surface Area > Planar Area
    sloped_surface_m2 = MeasurementEngine.calculate_terrain_surface_area(planar_m2, slope_deg=8.5)
    assert sloped_surface_m2 > planar_m2
    expected_sloped = round(planar_m2 / math.cos(math.radians(8.5)), 2)
    assert sloped_surface_m2 == expected_sloped

    # Multi-unit conversions check
    metrics = MeasurementEngine.compute_comprehensive_parcel_metrics(coords, slope_deg=8.5)
    assert metrics["planar_area"]["hectares"] == round(planar_m2 / 10000.0, 4)
    assert metrics["planar_area"]["acres"] == round(planar_m2 / 4046.8564, 4)
    assert metrics["surface_area_3d"]["square_meters"] == sloped_surface_m2
    assert metrics["scale_invariance_certified"] is True


def test_georeferencer_wgs84_utm_conversion():
    """
    Validates Transverse Mercator forward and inverse coordinate projections between WGS84 and UTM 43N.
    """
    georef = Georeferencer()
    lon, lat = 73.7125, 24.5854

    easting, northing = georef.wgs84_to_utm_zone_43n(lon, lat)
    assert easting > 300000.0 and easting < 400000.0
    assert northing > 2700000.0 and northing < 2800000.0

    # Test camera perspective footprint projection
    footprint = georef.georeference_camera_ray(
        center_lat=lat,
        center_lon=lon,
        altitude_m=120.0,
        footprint_width_m=206.0,
        footprint_height_m=137.0,
    )
    assert footprint["ground_footprint_geojson"]["type"] == "Polygon"
    assert len(footprint["ground_footprint_geojson"]["coordinates"][0]) == 5


def test_image_processor_gsd_and_footprint():
    """
    Validates Ground Sampling Distance (GSD) calculation in cm/pixel.
    """
    proc = ImageProcessor()
    # At 120m altitude AGL, GSD is ~4.29 cm/px (or 2.5cm at 70m)
    gsd_cm = proc.compute_ground_sampling_distance_cm(altitude_m=120.0)
    assert gsd_cm >= 2.0 and gsd_cm <= 5.0

    meta = proc.normalize_image_metadata(
        image_id="TEST-IMG-01",
        filename="DJI_0001.JPG",
        exif_data={"latitude": 24.5854, "longitude": 73.7125, "altitude_m": 120.0},
    )
    assert meta["gsd_cm_per_pixel"] == gsd_cm
    assert meta["coordinate_reference_system"] == "EPSG:4326"
    assert meta["quality_status"] == "VALIDATED"


def test_lidar_processor_summary_and_elevation_stats():
    """
    Validates Cloth Simulation Filter (CSF) point classification and elevation metrics.
    """
    lid_proc = LidarProcessor()
    summary = lid_proc.process_point_cloud_summary({
        "point_count": 5000000,
        "bounding_box": {"min_x": 73.71, "max_x": 73.72, "min_y": 24.58, "max_y": 24.59, "min_z": 580.0, "max_z": 620.0},
        "crs": "EPSG:4326",
    })

    assert summary["total_points"] == 5000000
    assert summary["ground_points"] == 3600000
    assert summary["non_ground_points"] == 1400000
    assert summary["elevation_stats"]["elevation_span_m"] == 40.0
    assert summary["elevation_stats"]["min_elevation_m"] == 580.0


def test_gnss_processor_accuracy_quality_gating():
    """
    Validates that centimeter-level accuracy is only assigned to FIXED_RTK fixes.
    """
    gnss = GnssProcessor()

    # High quality RTK fix
    fixed_records = [
        {"latitude": 24.585, "longitude": 73.712, "altitude": 510.0, "fix_status": "FIXED_RTK", "satellite_count": 18, "hdop": 0.65}
        for _ in range(10)
    ]
    summary_fixed = gnss.process_gnss_track(fixed_records)
    assert summary_fixed["dominant_fix_status"] == "FIXED_RTK"
    assert summary_fixed["reported_horizontal_accuracy_cm"] == 1.2
    assert summary_fixed["confidence_rating"] == "SURVEY_GRADE_CENTIMETRIC"

    # Degraded autonomous fix
    single_records = [
        {"latitude": 24.585, "longitude": 73.712, "altitude": 510.0, "fix_status": "SINGLE", "satellite_count": 8, "hdop": 2.4}
        for _ in range(10)
    ]
    summary_single = gnss.process_gnss_track(single_records)
    assert summary_single["dominant_fix_status"] == "SINGLE"
    assert summary_single["reported_horizontal_accuracy_cm"] == 250.0
    assert summary_single["confidence_rating"] == "AUTONOMOUS_LOW"


def test_boundary_detector_candidate_extraction():
    """
    Validates automatic extraction of candidate field boundaries with confidence scores.
    """
    detector = BoundaryDetector()
    bounds = detector.detect_candidate_boundaries("SUR-2026-001", {}, {})
    assert len(bounds) >= 5
    for b in bounds:
        assert b["status"] == "AUTO_DETECTED"
        assert b["confidence_score"] >= 0.80
        assert b["geometry_geojson"]["type"] == "Polygon"


# ==============================================================================
# INTEGRATION TESTS: REST API ENDPOINTS (/api/v1/)
# ==============================================================================

def test_pipeline_start_and_status_api(client):
    """
    Tests triggering the full 11-stage Geospatial Processing Pipeline via POST /api/v1/surveys/{id}/processing/start.
    """
    res = client.post(
        "/api/v1/surveys/SUR-2026-001/processing/start",
        json={"survey_id": "SUR-2026-001", "target_gsd_cm": 2.5, "target_dem_res_m": 0.5},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "COMPLETED"
    assert data["pipeline_executed_stages"] == 11
    assert "orthomosaic" in data
    assert "dem" in data
    assert "dsm" in data

    # Check status endpoint
    status_res = client.get("/api/v1/surveys/SUR-2026-001/processing/status")
    assert status_res.status_code == 200
    s_data = status_res.json()["data"]
    assert s_data["overall_status"] == "COMPLETED"
    assert len(s_data["stages"]) == 11


def test_orthomosaic_and_elevation_endpoints(client):
    """
    Tests retrieving orthomosaic, DEM, and DSM metadata manifests.
    """
    # Orthomosaic
    ortho_res = client.get("/api/v1/surveys/SUR-2026-001/orthomosaic")
    assert ortho_res.status_code == 200
    ortho = ortho_res.json()["data"]
    assert ortho["crs"] == "EPSG:4326"
    assert ortho["ground_sampling_distance_cm"] == 2.5

    # DEM
    dem_res = client.get("/api/v1/surveys/SUR-2026-001/dem")
    assert dem_res.status_code == 200
    dem = dem_res.json()["data"]
    assert dem["product_type"] == "DIGITAL_ELEVATION_MODEL_BARE_EARTH"
    assert "elevation_range" in dem

    # DSM
    dsm_res = client.get("/api/v1/surveys/SUR-2026-001/dsm")
    assert dsm_res.status_code == 200
    dsm = dsm_res.json()["data"]
    assert dsm["product_type"] == "DIGITAL_SURFACE_MODEL_FIRST_RETURN"


def test_spatial_layers_manifest_api(client):
    """
    Tests retrieving the 12-layer GIS map architecture manifest.
    """
    res = client.get("/api/v1/surveys/SUR-2026-001/spatial-layers")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_layers"] == 12
    layer_ids = [l["id"] for l in data["layers"]]
    assert "base-satellite" in layer_ids
    assert "orthomosaic-raster" in layer_ids
    assert "dem-elevation" in layer_ids
    assert "detected-parcels" in layer_ids


def test_parcel_creation_and_vertex_update(client):
    """
    Tests creating a parcel polygon and updating its boundary vertices with real-time measurement recalculation.
    """
    new_poly = {
        "type": "Polygon",
        "coordinates": [[
            [73.7115, 24.5850],
            [73.7125, 24.5850],
            [73.7125, 24.5860],
            [73.7115, 24.5860],
            [73.7115, 24.5850],
        ]],
    }

    # 1. Create parcel
    create_res = client.post(
        "/api/v1/surveys/SUR-2026-001/parcels",
        json={
            "parcel_id": "PRC-SUR-2026-001-TEST",
            "geometry_geojson": new_poly,
            "land_use": "AGRICULTURAL_CROP",
            "slope_degrees": 4.2,
        },
    )
    assert create_res.status_code == 201
    created = create_res.json()["data"]
    assert created["area_m2"] > 5000.0
    assert created["surface_area_m2"] > created["area_m2"]

    # 2. Update vertex geometry (move East boundary)
    updated_poly = {
        "type": "Polygon",
        "coordinates": [[
            [73.7115, 24.5850],
            [73.7130, 24.5850],  # Expanded from 73.7125 to 73.7130
            [73.7130, 24.5860],
            [73.7115, 24.5860],
            [73.7115, 24.5850],
        ]],
    }

    update_res = client.put(
        "/api/v1/parcels/PRC-SUR-2026-001-TEST",
        json={"geometry_geojson": updated_poly, "slope_degrees": 4.2},
    )
    assert update_res.status_code == 200
    updated = update_res.json()["data"]
    assert updated["version"] == 2
    assert updated["area_m2"] > created["area_m2"]  # Verified expanded area

    # 3. Check measurements endpoint
    measure_res = client.get("/api/v1/parcels/PRC-SUR-2026-001-TEST/measurements")
    assert measure_res.status_code == 200
    m_data = measure_res.json()["data"]
    assert "planar_area" in m_data
    assert "surface_area_3d" in m_data
    assert m_data["surface_area_3d"]["square_meters"] > m_data["planar_area"]["square_meters"]


def test_invalid_geometry_rejection(client):
    """
    Tests that invalid polygon rings (< 3 vertices) are rejected with HTTP 422.
    """
    invalid_poly = {
        "type": "Polygon",
        "coordinates": [[[73.7115, 24.5850], [73.7125, 24.5850]]],  # Only 2 points
    }

    res = client.post(
        "/api/v1/surveys/SUR-2026-001/parcels",
        json={"geometry_geojson": invalid_poly},
    )
    assert res.status_code == 422
