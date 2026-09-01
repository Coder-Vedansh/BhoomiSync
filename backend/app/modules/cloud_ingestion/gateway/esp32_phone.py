import uuid
from typing import Dict, Any, List
from datetime import datetime
from app.modules.cloud_ingestion.gateway.base import (
    DataGateway,
    GatewayType,
    GatewayStatus,
    TelemetryPacket,
    IngestionBatchReport
)


class ESP32PhoneGateway(DataGateway):
    """
    Current Prototype Implementation:
    Drone Sensors -> ESP32 -> BLE/Wi-Fi -> Surveyor Mobile Phone App -> Cellular/Internet -> BhoomiSync.
    
    This gateway models the mobile phone relay where the phone buffers camera/LiDAR/RTK metadata
    and batches uploads to BhoomiSync via REST APIs.
    """

    def __init__(
        self,
        gateway_id: str = "ESP32-HARIPURA-PROTO-01",
        phone_relay_app_version: str = "1.0.4-field-beta"
    ):
        super().__init__(gateway_id=gateway_id, gateway_type=GatewayType.ESP32_PHONE)
        self.phone_relay_app_version = phone_relay_app_version
        self.esp32_firmware_version = "v2.1.0-bhoomi-telemetry"
        self.ble_signal_strength_dbm = -64
        self.cellular_network_type = "4G_LTE"

    def validate_connection(self) -> bool:
        """Simulates validation of mobile phone relay authentication and token."""
        return True

    def ingest_telemetry_stream(self, packets: List[TelemetryPacket]) -> IngestionBatchReport:
        """Processes batched RTK/GNSS points relayed from phone."""
        batch_id = f"BATCH-ESP32-{uuid.uuid4().hex[:8].upper()}"
        return IngestionBatchReport(
            batch_id=batch_id,
            gateway_id=self.gateway_id,
            gateway_type=self.gateway_type,
            records_received=len(packets),
            records_persisted=len(packets),
            bytes_uploaded=len(packets) * 128,
            status="SUCCESS",
            timestamp=datetime.utcnow()
        )

    def ingest_sensor_payload(
        self,
        survey_id: str,
        sensor_type: str,
        payload_meta: Dict[str, Any]
    ) -> IngestionBatchReport:
        batch_id = f"BATCH-SENSOR-{uuid.uuid4().hex[:8].upper()}"
        return IngestionBatchReport(
            batch_id=batch_id,
            gateway_id=self.gateway_id,
            gateway_type=self.gateway_type,
            records_received=1,
            records_persisted=1,
            bytes_uploaded=payload_meta.get("file_size_bytes", 0),
            status="STAGED_IN_OBJECT_STORAGE",
            timestamp=datetime.utcnow()
        )

    def get_gateway_info(self) -> Dict[str, Any]:
        return {
            "gateway_id": self.gateway_id,
            "gateway_type": self.gateway_type.value,
            "status": self.status.value,
            "topology": "Sensors -> ESP32 -> Surveyor Phone -> Internet -> BhoomiSync",
            "phone_relay_app_version": self.phone_relay_app_version,
            "esp32_firmware_version": self.esp32_firmware_version,
            "telemetry_stream_protocol": "HTTPS_BATCHED_RELAY",
            "hardware_notes": "ESP32-WROOM-32 connected to RTK GNSS via UART & camera trigger optocoupler"
        }
