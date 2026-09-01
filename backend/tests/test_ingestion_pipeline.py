import io
import struct
from PIL import Image, ExifTags
import pytest
from httpx import Response


def create_mock_jpeg_with_exif(lat=24.5854, lon=73.7125, alt=512.0) -> bytes:
    """Creates in-memory JPEG with valid EXIF GPS metadata."""
    img = Image.new("RGB", (200, 200), color=(73, 109, 137))
    exif = img.getexif()

    # Camera model and make
    exif[ExifTags.Base.Make] = "Sony"
    exif[ExifTags.Base.Model] = "DSC-RX0M2"
    exif[ExifTags.Base.DateTime] = "2026:08:31 10:15:30"

    # Set GPS IFD
    gps_ifd = {}
    lat_deg = int(lat)
    lat_min = int((lat - lat_deg) * 60)
    lat_sec = ((lat - lat_deg) * 60 - lat_min) * 60
    gps_ifd[ExifTags.GPS.GPSLatitude] = (lat_deg, lat_min, lat_sec)
    gps_ifd[ExifTags.GPS.GPSLatitudeRef] = "N"

    lon_deg = int(lon)
    lon_min = int((lon - lon_deg) * 60)
    lon_sec = ((lon - lon_deg) * 60 - lon_min) * 60
    gps_ifd[ExifTags.GPS.GPSLongitude] = (lon_deg, lon_min, lon_sec)
    gps_ifd[ExifTags.GPS.GPSLongitudeRef] = "E"
    gps_ifd[ExifTags.GPS.GPSAltitude] = float(alt)

    exif[ExifTags.Base.GPSInfo] = gps_ifd

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def create_mock_las_bytes(point_count=25000) -> bytes:
    """Generates synthetic LAS 1.2 binary header with bounding box coordinates."""
    header = bytearray(227)
    header[0:4] = b"LASF"
    header[24:26] = struct.pack("BB", 1, 2)
    header[94:96] = struct.pack("<H", 227)
    header[96:100] = struct.pack("<I", 227)
    header[107:111] = struct.pack("<I", point_count)

    # Scale factors: 0.001
    header[131:155] = struct.pack("<ddd", 0.001, 0.001, 0.001)

    # Max/Min bounds: max_x, min_x, max_y, min_y, max_z, min_z
    max_x, min_x = 73.7155, 73.7110
    max_y, min_y = 24.5875, 24.5845
    max_z, min_z = 515.0, 480.0
    header[179:227] = struct.pack("<dddddd", max_x, min_x, max_y, min_y, max_z, min_z)

    return bytes(header)


def test_list_and_create_sensor(client):
    # 1. List sensors
    res = client.get("/api/v1/sensors")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) >= 3

    # 2. Create new sensor
    payload = {
        "sensor_id": "SENSOR-THERMAL-FLIR-01",
        "name": "FLIR Vue Pro R Thermal Camera",
        "sensor_type": "THERMAL",
        "model": "Vue Pro R 640",
        "specifications_json": {"resolution": "640x512", "spectral_range_um": "7.5-13.5"}
    }
    res2 = client.post("/api/v1/sensors", json=payload)
    assert res2.status_code == 200
    created = res2.json()["data"]
    assert created["sensor_id"] == "SENSOR-THERMAL-FLIR-01"
    assert created["sensor_type"] == "THERMAL"


def test_upload_session_lifecycle(client):
    # Create upload session
    payload = {
        "survey_id": 1,
        "device_id": "ESP32-TEST-RIG-01",
        "gateway_type": "ESP32_PHONE",
        "meta_info": {"operator": "Test Surveyor"}
    }
    res = client.post("/api/v1/surveys/SUR-2026-001/upload-sessions", json=payload)
    assert res.status_code == 200
    session = res.json()["data"]
    session_id = session["session_id"]
    assert session_id.startswith("SESSION-SUR-2026-001-")
    assert session["status"] == "CREATED"

    # Get session details
    res_get = client.get(f"/api/v1/upload-sessions/{session_id}")
    assert res_get.status_code == 200
    assert res_get.json()["data"]["session_id"] == session_id

    # Complete session
    res_comp = client.post(f"/api/v1/upload-sessions/{session_id}/complete")
    assert res_comp.status_code == 200
    assert res_comp.json()["data"]["status"] == "COMPLETED"


def test_upload_camera_image_with_exif(client):
    jpeg_bytes = create_mock_jpeg_with_exif(lat=24.5860, lon=73.7135, alt=515.2)

    files = {
        "file": ("TEST_NADIR_001.JPG", io.BytesIO(jpeg_bytes), "image/jpeg")
    }
    data = {
        "session_id": "SESSION-2026-001-A1",
        "sensor_id": "SENSOR-RGB-SONY-01"
    }

    res = client.post("/api/v1/surveys/SUR-2026-001/upload", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    file_info = res_data["data"]

    assert file_info["filename"] == "TEST_NADIR_001.JPG"
    assert file_info["file_format"] == "JPG"
    assert file_info["is_duplicate"] is False
    assert file_info["latitude"] is not None
    assert round(file_info["latitude"], 2) == 24.59
    assert round(file_info["longitude"], 2) == 73.71
    assert file_info["exif_metadata_json"]["camera_make"] == "Sony"
    assert file_info["exif_metadata_json"]["camera_model"] == "DSC-RX0M2"


def test_upload_lidar_las_file(client):
    las_bytes = create_mock_las_bytes(point_count=50000)

    files = {
        "file": ("TEST_LIDAR_SCAN_01.LAS", io.BytesIO(las_bytes), "application/octet-stream")
    }
    data = {
        "session_id": "SESSION-2026-001-A1",
        "sensor_id": "SENSOR-LIDAR-LIVOX-01"
    }

    res = client.post("/api/v1/surveys/SUR-2026-001/upload", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    file_info = res_data["data"]

    assert file_info["file_format"] == "LAS"
    assert file_info["lidar_metadata_json"]["point_count"] == 50000
    assert file_info["lidar_metadata_json"]["is_valid"] is True
    assert len(file_info["lidar_metadata_json"]["bounding_box"]) == 6


def test_duplicate_file_detection(client):
    # Same content uploaded twice
    content = b"SIMULATED_REPEAT_SENSOR_STREAM_DATA_BYTES_12345"
    files1 = {"file": ("REPEAT_LOG_01.CSV", io.BytesIO(content), "text/csv")}
    
    res1 = client.post("/api/v1/surveys/SUR-2026-001/upload", files=files1)
    assert res1.status_code == 200
    f1 = res1.json()["data"]
    assert f1["is_duplicate"] is False

    # Second upload of exact same bytes
    files2 = {"file": ("REPEAT_LOG_01.CSV", io.BytesIO(content), "text/csv")}
    res2 = client.post("/api/v1/surveys/SUR-2026-001/upload", files=files2)
    assert res2.status_code == 200
    f2 = res2.json()["data"]
    assert f2["is_duplicate"] is True
    assert f2["duplicate_of_file_id"] == f1["file_id"]


def test_invalid_file_format_rejection(client):
    files = {"file": ("malicious_payload.exe", io.BytesIO(b"MZ\x90\x00"), "application/x-msdownload")}
    res = client.post("/api/v1/surveys/SUR-2026-001/upload", files=files)
    assert res.status_code == 422
    data = res.json()
    assert data["success"] is False
    assert "Unsupported file format" in data["error"]["message"]


def test_spatial_footprint_endpoint(client):
    res = client.get("/api/v1/surveys/SUR-2026-001/spatial-footprint")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["survey_id"] == "SUR-2026-001"
    assert "camera_points_geojson" in data
    assert "lidar_footprint_geojson" in data
    assert "rtk_trajectory_geojson" in data
    assert data["total_images_mapped"] >= 1
    assert data["total_trajectory_points"] >= 1


def test_processing_jobs_queue(client):
    res = client.get("/api/v1/processing/jobs?survey_id=SUR-2026-001")
    assert res.status_code == 200
    jobs = res.json()["data"]
    assert len(jobs) >= 1
    assert any(j["job_type"] in ("IMAGE_PREPROCESSING", "LIDAR_PREPROCESSING", "GEOREFERENCING") for j in jobs)
