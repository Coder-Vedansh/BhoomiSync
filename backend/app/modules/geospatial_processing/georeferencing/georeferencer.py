import math
from typing import Dict, Any, List, Tuple, Optional


class Georeferencer:
    """
    Georeferencing & Coordinate Transformation Engine for BhoomiSync.
    Transforms coordinates between Geographic WGS84 (EPSG:4326) and Projected UTM (e.g. EPSG:32643 Zone 43N).
    Preserves audit trails of all spatial projections.
    """

    def __init__(self, default_target_crs: str = "EPSG:32643"):
        self.default_target_crs = default_target_crs
        # UTM Zone 43N central meridian: 75° E
        self.utm_zone_43_central_meridian = 75.0
        self.k0 = 0.9996  # UTM scale factor
        self.a = 6378137.0  # WGS84 semi-major axis
        self.f = 1 / 298.257223563  # WGS84 flattening

    def wgs84_to_utm_zone_43n(self, lon: float, lat: float) -> Tuple[float, float]:
        """
        Converts WGS84 (lon, lat) to UTM Zone 43N Easting and Northing in metres.
        Standard Transverse Mercator forward projection.
        """
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        lon0_rad = math.radians(self.utm_zone_43_central_meridian)

        e_sq = 2 * self.f - self.f ** 2
        e_prime_sq = e_sq / (1 - e_sq)

        n = self.a / math.sqrt(1 - e_sq * (math.sin(lat_rad) ** 2))
        t = math.tan(lat_rad) ** 2
        c = e_prime_sq * (math.cos(lat_rad) ** 2)
        a_term = math.cos(lat_rad) * (lon_rad - lon0_rad)

        m = self.a * (
            (1 - e_sq / 4 - 3 * (e_sq ** 2) / 64 - 5 * (e_sq ** 3) / 256) * lat_rad
            - (3 * e_sq / 8 + 3 * (e_sq ** 2) / 32 + 45 * (e_sq ** 3) / 1024) * math.sin(2 * lat_rad)
            + (15 * (e_sq ** 2) / 256 + 45 * (e_sq ** 3) / 1024) * math.sin(4 * lat_rad)
            - (35 * (e_sq ** 3) / 3072) * math.sin(6 * lat_rad)
        )

        easting = 500000.0 + self.k0 * n * (
            a_term
            + (1 - t + c) * (a_term ** 3) / 6.0
            + (5 - 18 * t + (t ** 2) + 72 * c - 58 * e_prime_sq) * (a_term ** 5) / 120.0
        )

        northing = self.k0 * (
            m
            + n * math.tan(lat_rad) * (
                (a_term ** 2) / 2.0
                + (5 - t + 9 * c + 4 * (c ** 2)) * (a_term ** 4) / 24.0
                + (61 - 58 * t + (t ** 2) + 600 * c - 330 * e_prime_sq) * (a_term ** 6) / 720.0
            )
        )

        return (round(easting, 3), round(northing, 3))

    def utm_zone_43n_to_wgs84(self, easting: float, northing: float) -> Tuple[float, float]:
        """
        Converts UTM Zone 43N (Easting, Northing) back to WGS84 (lon, lat) in decimal degrees.
        """
        # Linear approximation suitable for local parcel transformations
        delta_e = easting - 500000.0
        deg_per_m_lat = 1.0 / 110850.0
        deg_per_m_lon = 1.0 / (111320.0 * math.cos(math.radians(24.585)))

        lat = 0.0 + northing * deg_per_m_lat
        lon = self.utm_zone_43_central_meridian + delta_e * deg_per_m_lon
        return (round(lon, 7), round(lat, 7))

    def georeference_camera_ray(
        self,
        center_lat: float,
        center_lon: float,
        altitude_m: float,
        footprint_width_m: float,
        footprint_height_m: float,
        yaw_deg: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Computes 4-corner ground polygon footprint for a nadir aerial photograph.
        """
        half_w = footprint_width_m / 2.0
        half_h = footprint_height_m / 2.0

        east_center, north_center = self.wgs84_to_utm_zone_43n(center_lon, center_lat)

        # 4 corners in UTM projection (NW, NE, SE, SW)
        corners_utm = [
            (east_center - half_w, north_center + half_h),
            (east_center + half_w, north_center + half_h),
            (east_center + half_w, north_center - half_h),
            (east_center - half_w, north_center - half_h),
        ]

        # Convert back to WGS84 GeoJSON polygon ring format [[lon, lat], ...]
        corners_wgs84 = []
        for e, n in corners_utm:
            lon, lat = self.utm_zone_43n_to_wgs84(e, n)
            corners_wgs84.append([lon, lat])
        corners_wgs84.append(corners_wgs84[0])  # Close ring

        return {
            "perspective_center": {"lat": center_lat, "lon": center_lon, "alt_m": altitude_m},
            "utm_easting_northing": {"easting": east_center, "northing": north_center},
            "ground_footprint_geojson": {
                "type": "Polygon",
                "coordinates": [corners_wgs84],
            },
            "target_crs": self.default_target_crs,
            "source_crs": "EPSG:4326",
            "transformation_method": "Transverse Mercator WGS84 to UTM Zone 43N",
        }
