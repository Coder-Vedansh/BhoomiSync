from typing import Dict, Any, List
from datetime import datetime
from app.modules.cloud_ingestion.gateway.base import (
    DataGateway,
    GatewayType,
    GatewayStatus,
    TelemetryPacket,
    IngestionBatchReport
)


class CompanionComputerGateway(DataGateway):
    """
    Future Architecture Interface Stub:
    Drone Sensors -> Companion Computer (e.g. Jetson / Raspberry Pi / x86 SBC) -> 4G/5G/Wi-Fi -> BhoomiSync Cloud.
    
    This stub establishes the interface contract for high-bandwidth direct onboard streaming
    when BhoomiSync custom custom-built drones are introduced in future phases.
    """

    def __init__(self, gateway_id: str = "CC-FUTURE-STUB"):
        super().__init__(gateway_id=gateway_id, gateway_type=GatewayType.COMPANION_COMPUTER)
        self.status = GatewayStatus.OFFLINE  # Not deployed in prototype phase

    def validate_connection(self) -> bool:
        raise NotImplementedError("Companion Computer Gateway will be active in custom drone hardware phase.")

    def ingest_telemetry_stream(self, packets: List[TelemetryPacket]) -> IngestionBatchReport:
        raise NotImplementedError("Companion Computer direct streaming will be active in future drone phase.")

    def ingest_sensor_payload(
        self,
        survey_id: str,
        sensor_type: str,
        payload_meta: Dict[str, Any]
    ) -> IngestionBatchReport:
        raise NotImplementedError("Companion Computer payload upload will be active in future drone phase.")

    def get_gateway_info(self) -> Dict[str, Any]:
        return {
            "gateway_id": self.gateway_id,
            "gateway_type": self.gateway_type.value,
            "status": "FUTURE_DESIGN_STUB",
            "topology": "Sensors -> Onboard Companion Computer -> 4G/5G/Wi-Fi -> BhoomiSync Cloud",
            "target_hardware": "NVIDIA Jetson Orin / Industrial ARM SBC",
            "notes": "Direct sensor bus capture (MIPI CSI-2 / USB 3.0 / PCIe / CAN) without phone intermediary."
        }
