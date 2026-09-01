import pytest
from app.modules.gis.spatial_utils import (
    haversine_distance,
    calculate_polygon_perimeter_m,
    calculate_geodesic_polygon_area_m2,
    calculate_polygon_centroid,
    compute_parcel_metrics_from_geojson
)


def test_haversine_distance():
    # Distance between two known coordinates (approx 111 km for 1 deg latitude)
    pt1 = (73.71, 24.58)
    pt2 = (73.71, 25.58)
    dist = haversine_distance(pt1, pt2)
    assert 110000 < dist < 112000


def test_polygon_area_and_perimeter():
    coords = [
        [73.7110, 24.5845],
        [73.7130, 24.5845],
        [73.7130, 24.5865],
        [73.7110, 24.5865],
        [73.7110, 24.5845]
    ]
    area = calculate_geodesic_polygon_area_m2(coords)
    perimeter = calculate_polygon_perimeter_m(coords)
    assert area > 1000  # Positive physical area
    assert perimeter > 100  # Positive physical perimeter


def test_compute_parcel_metrics():
    geom = {
        "type": "Polygon",
        "coordinates": [[
            [73.7110, 24.5845],
            [73.7130, 24.5845],
            [73.7130, 24.5865],
            [73.7110, 24.5865],
            [73.7110, 24.5845]
        ]]
    }
    metrics = compute_parcel_metrics_from_geojson(geom)
    assert metrics["area_m2"] > 0
    assert metrics["area_hectares"] > 0
    assert metrics["area_acres"] > 0
    assert metrics["centroid_lat"] > 0
    assert metrics["centroid_lon"] > 0
