import enum
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel


class GatewayType(str, enum.Enum):
    ESP32_PHONE = "ESP32_PHONE"
    COMPANION_COMPUTER = "COMPANION_COMPUTER"
    MOCK_ACQUISITION = "MOCK_ACQUISITION"


class GatewayStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    SYNCING = "SYNCING"
    ERROR = "ERROR"


class TelemetryPacket(BaseModel):
    """Encapsulates a time-stamped sensor/RTK/GNSS telemetry reading from drone sensors."""
    timestamp: datetime
    latitude: float
    longitude: float
    altitude_ellipsoidal_m: float
    relative_altitude_m: float
    heading_deg: float
    rtk_fix_type: str  # FIX_3D, FLOAT_RTK, FIXED_RTK
    rtk_hdop: float
    satellites_visible: int
    battery_percentage: float
    raw_sensor_flags: Dict[str, Any] = {}


class IngestionBatchReport(BaseModel):
    batch_id: str
    gateway_id: str
    gateway_type: GatewayType
    records_received: int
    records_persisted: int
    bytes_uploaded: int
    status: str
    timestamp: datetime


class DataGateway(ABC):
    """
    Abstract Data Gateway Interface.
    Decouples BhoomiSync from specific hardware sensor transmission channels.
    
    Current: ESP32 -> Phone -> Internet -> BhoomiSync
    Future: Drone Sensors -> Companion Computer -> 4G/5G/Wi-Fi -> BhoomiSync
    
    NOTE: Data Gateway handles SENSOR DATA ACQUISITION & INGESTION only.
    Drone control (MAVLink, navigation, waypoints) is strictly OUT OF SCOPE.
    """

    def __init__(self, gateway_id: str, gateway_type: GatewayType):
        self.gateway_id = gateway_id
        self.gateway_type = gateway_type
        self.status = GatewayStatus.ONLINE

    @abstractmethod
    def validate_connection(self) -> bool:
        """Verifies handshake and authorization between gateway relay and BhoomiSync."""
        pass

    @abstractmethod
    def ingest_telemetry_stream(self, packets: List[TelemetryPacket]) -> IngestionBatchReport:
        """Ingests high-frequency RTK/GNSS position and orientation stream."""
        pass

    @abstractmethod
    def ingest_sensor_payload(
        self,
        survey_id: str,
        sensor_type: str,
        payload_meta: Dict[str, Any]
    ) -> IngestionBatchReport:
        """Ingests image/LiDAR file metadata and checksum manifest transferred via gateway."""
        pass

    @abstractmethod
    def get_gateway_info(self) -> Dict[str, Any]:
        """Returns hardware, firmware, and connectivity health status."""
        pass
