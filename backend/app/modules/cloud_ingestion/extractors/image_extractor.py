import io
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from PIL import Image, ExifTags


def _convert_to_degrees(value) -> Optional[float]:
    """Converts EXIF GPS coordinate format (degrees, minutes, seconds) to decimal degrees."""
    try:
        if isinstance(value, (tuple, list)) and len(value) == 3:
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        return float(value)
    except Exception:
        return None


def extract_image_metadata(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Extracts camera, EXIF, and GPS metadata from raw image bytes.
    The original binary file is completely untouched/immutable.
    """
    metadata: Dict[str, Any] = {
        "filename": filename,
        "width": None,
        "height": None,
        "format": None,
        "mode": None,
        "camera_make": None,
        "camera_model": None,
        "focal_length_mm": None,
        "iso": None,
        "shutter_speed": None,
        "aperture": None,
        "orientation": None,
        "capture_timestamp": None,
        "latitude": None,
        "longitude": None,
        "altitude_m": None,
        "has_gps": False
    }

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            metadata["width"] = img.width
            metadata["height"] = img.height
            metadata["format"] = img.format
            metadata["mode"] = img.mode

            exif_raw = img._getexif()
            if not exif_raw:
                return metadata

            # Map numeric tags to human-readable names
            exif = {}
            for tag_id, val in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, tag_id)
                exif[tag_name] = val

            # Basic camera parameters
            metadata["camera_make"] = str(exif.get("Make")).strip() if exif.get("Make") else None
            metadata["camera_model"] = str(exif.get("Model")).strip() if exif.get("Model") else None
            metadata["orientation"] = exif.get("Orientation")
            
            focal = exif.get("FocalLength")
            if focal is not None:
                metadata["focal_length_mm"] = float(focal)

            # Capture timestamp
            dt_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
            if dt_str:
                try:
                    # Standard EXIF format: 'YYYY:MM:DD HH:MM:SS'
                    parsed_dt = datetime.strptime(str(dt_str).strip(), "%Y:%m:%d %H:%M:%S")
                    metadata["capture_timestamp"] = parsed_dt.isoformat()
                except Exception:
                    metadata["capture_timestamp"] = str(dt_str)

            # GPS extraction
            gps_info = exif.get("GPSInfo")
            if gps_info:
                gps_tags = {}
                for t, v in gps_info.items():
                    sub_name = ExifTags.GPSTAGS.get(t, t)
                    gps_tags[sub_name] = v

                lat_val = gps_tags.get("GPSLatitude")
                lat_ref = gps_tags.get("GPSLatitudeRef", "N")
                lon_val = gps_tags.get("GPSLongitude")
                lon_ref = gps_tags.get("GPSLongitudeRef", "E")
                alt_val = gps_tags.get("GPSAltitude")

                lat = _convert_to_degrees(lat_val)
                if lat is not None and lat_ref == "S":
                    lat = -lat

                lon = _convert_to_degrees(lon_val)
                if lon is not None and lon_ref == "W":
                    lon = -lon

                if lat is not None and lon is not None:
                    metadata["latitude"] = round(lat, 7)
                    metadata["longitude"] = round(lon, 7)
                    metadata["has_gps"] = True

                if alt_val is not None:
                    try:
                        metadata["altitude_m"] = round(float(alt_val), 2)
                    except Exception:
                        pass

    except Exception as e:
        metadata["extraction_warning"] = f"Partial metadata extracted: {str(e)}"

    return metadata
