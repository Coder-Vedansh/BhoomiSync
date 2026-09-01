import math
from typing import Dict, Any, List, Tuple


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Computes geodesic distance between two [lon, lat] coordinates on WGS84 ellipsoid in metres.
    """
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    
    r = 6371008.8  # Mean Earth radius in metres
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def calculate_polygon_perimeter_m(coordinates: List[List[float]]) -> float:
    """
    Calculates the true real-world perimeter of a polygon ring in metres.
    Coordinates format: [[lon, lat], [lon, lat], ...] in EPSG:4326.
    """
    if len(coordinates) < 3:
        return 0.0
    
    total_perimeter = 0.0
    for i in range(len(coordinates) - 1):
        pt1 = (coordinates[i][0], coordinates[i][1])
        pt2 = (coordinates[i+1][0], coordinates[i+1][1])
        total_perimeter += haversine_distance(pt1, pt2)
        
    # Check closure
    first_pt = (coordinates[0][0], coordinates[0][1])
    last_pt = (coordinates[-1][0], coordinates[-1][1])
    if first_pt != last_pt:
        total_perimeter += haversine_distance(last_pt, first_pt)
        
    return round(total_perimeter, 2)


def calculate_geodesic_polygon_area_m2(coordinates: List[List[float]]) -> float:
    """
    Computes true geodesic area of a polygon on WGS84 ellipsoid in square metres (m²).
    Uses the spherical excess formula (Chamberlain-Duquette algorithm) on WGS84.
    """
    if len(coordinates) < 3:
        return 0.0

    r = 6378137.0  # WGS84 Semi-major axis
    total_area = 0.0

    # Ensure closed ring
    ring = list(coordinates)
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    for i in range(len(ring) - 1):
        lon1, lat1 = ring[i]
        lon2, lat2 = ring[i + 1]

        p1 = math.radians(lat1)
        p2 = math.radians(lat2)
        lambda_diff = math.radians(lon2 - lon1)

        total_area += lambda_diff * (2.0 + math.sin(p1) + math.sin(p2))

    total_area = abs(total_area * (r ** 2) / 4.0)
    return round(total_area, 2)


def calculate_polygon_centroid(coordinates: List[List[float]]) -> Tuple[float, float]:
    """
    Computes geographical centroid (latitude, longitude) of a coordinate ring.
    """
    if not coordinates:
        return (0.0, 0.0)

    # Exclude duplicate closing point if present
    pts = coordinates[:-1] if coordinates[0] == coordinates[-1] and len(coordinates) > 1 else coordinates
    avg_lon = sum(pt[0] for pt in pts) / len(pts)
    avg_lat = sum(pt[1] for pt in pts) / len(pts)
    return (round(avg_lat, 6), round(avg_lon, 6))


def calculate_bounding_box(coordinates: List[List[float]]) -> List[float]:
    """
    Returns [min_lon, min_lat, max_lon, max_lat] for a list of coordinates.
    """
    if not coordinates:
        return [0.0, 0.0, 0.0, 0.0]
    
    lons = [pt[0] for pt in coordinates]
    lats = [pt[1] for pt in coordinates]
    return [min(lons), min(lats), max(lons), max(lats)]


def compute_parcel_metrics_from_geojson(geojson_geom: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates geodesic area (m², ha, acres), perimeter (m), and centroid from a GeoJSON geometry.
    """
    geom_type = geojson_geom.get("type", "Polygon")
    coords = geojson_geom.get("coordinates", [])

    if geom_type == "Polygon" and coords:
        exterior_ring = coords[0]
        area_m2 = calculate_geodesic_polygon_area_m2(exterior_ring)
        perimeter_m = calculate_polygon_perimeter_m(exterior_ring)
        centroid_lat, centroid_lon = calculate_polygon_centroid(exterior_ring)
        bbox = calculate_bounding_box(exterior_ring)
    elif geom_type == "MultiPolygon" and coords:
        total_area = 0.0
        total_perim = 0.0
        all_lons = []
        all_lats = []
        for poly in coords:
            ring = poly[0]
            total_area += calculate_geodesic_polygon_area_m2(ring)
            total_perim += calculate_polygon_perimeter_m(ring)
            all_lons.extend([pt[0] for pt in ring])
            all_lats.extend([pt[1] for pt in ring])
        area_m2 = round(total_area, 2)
        perimeter_m = round(total_perim, 2)
        centroid_lat = round(sum(all_lats) / len(all_lats), 6) if all_lats else 0.0
        centroid_lon = round(sum(all_lons) / len(all_lons), 6) if all_lons else 0.0
        bbox = [min(all_lons), min(all_lats), max(all_lons), max(all_lats)] if all_lons else [0, 0, 0, 0]
    else:
        area_m2 = 0.0
        perimeter_m = 0.0
        centroid_lat, centroid_lon = 0.0, 0.0
        bbox = [0.0, 0.0, 0.0, 0.0]

    area_ha = round(area_m2 / 10000.0, 4)
    area_acres = round(area_m2 / 4046.8564, 4)

    return {
        "area_m2": area_m2,
        "area_hectares": area_ha,
        "area_acres": area_acres,
        "perimeter_m": perimeter_m,
        "centroid_lat": centroid_lat,
        "centroid_lon": centroid_lon,
        "bounding_box": bbox
    }
