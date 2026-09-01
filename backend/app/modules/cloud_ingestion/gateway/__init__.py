from app.modules.cloud_ingestion.gateway.base import (
    DataGateway,
    GatewayType,
    GatewayStatus,
    TelemetryPacket,
    IngestionBatchReport,
)
from app.modules.cloud_ingestion.gateway.esp32_phone import ESP32PhoneGateway
from app.modules.cloud_ingestion.gateway.companion_computer import CompanionComputerGateway
from app.core.config import settings


def get_data_gateway() -> DataGateway:
    """Factory to retrieve current active acquisition gateway."""
    gateway_type = settings.DATA_GATEWAY_TYPE.upper()
    if gateway_type == "COMPANION_COMPUTER":
        return CompanionComputerGateway(gateway_id=settings.DATA_GATEWAY_DEVICE_ID)
    return ESP32PhoneGateway(gateway_id=settings.DATA_GATEWAY_DEVICE_ID)


__all__ = [
    "DataGateway",
    "GatewayType",
    "GatewayStatus",
    "TelemetryPacket",
    "IngestionBatchReport",
    "ESP32PhoneGateway",
    "CompanionComputerGateway",
    "get_data_gateway",
]
