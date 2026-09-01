import io
from app.modules.cloud_ingestion.storage_provider import MockStorageProvider
from app.modules.cloud_ingestion.gateway.esp32_phone import ESP32PhoneGateway
from app.modules.cloud_ingestion.gateway.companion_computer import CompanionComputerGateway


def test_mock_storage_upload_and_download(tmp_path):
    storage = MockStorageProvider(base_directory=str(tmp_path), bucket_name="test-bucket")
    
    data = b"BhoomiSync Mock LiDAR Point Cloud Data Payload"
    f = io.BytesIO(data)
    meta = storage.upload_file(f, "raw/survey_01/lidar.las", "application/octet-stream")
    
    assert meta.filename == "lidar.las"
    assert meta.file_size_bytes == len(data)
    assert meta.checksum_sha256 != ""
    
    downloaded = storage.download_file("raw/survey_01/lidar.las")
    assert downloaded == data


def test_esp32_gateway_info():
    gateway = ESP32PhoneGateway(gateway_id="ESP32-TEST-01")
    assert gateway.validate_connection() is True
    info = gateway.get_gateway_info()
    assert info["gateway_type"] == "ESP32_PHONE"
    assert "Sensors -> ESP32 -> Surveyor Phone -> Internet -> BhoomiSync" in info["topology"]


def test_companion_computer_gateway_stub():
    gateway = CompanionComputerGateway(gateway_id="CC-TEST-01")
    info = gateway.get_gateway_info()
    assert info["gateway_type"] == "COMPANION_COMPUTER"
    assert info["status"] == "FUTURE_DESIGN_STUB"
