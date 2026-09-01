import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseReportGenerator(ABC):
    """
    Abstract Base Class for all BhoomiSync Digital Survey Report Generators.
    Ensures uniform lifecycle, validation, checksum calculation, and metadata extraction.
    """

    def __init__(self, format_name: str, mime_type: str, file_extension: str):
        self.format_name = format_name
        self.mime_type = mime_type
        self.file_extension = file_extension

    @abstractmethod
    def generate(self, snapshot: Dict[str, Any], **kwargs) -> bytes:
        """
        Transforms immutable snapshot dictionary into target file format bytes.
        """
        pass

    def calculate_checksum(self, content: bytes) -> str:
        """
        Calculates SHA-256 cryptographic hash of generated file content.
        """
        return hashlib.sha256(content).hexdigest()

    def get_metadata(self, content: bytes, file_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns metadata payload for tracking within the storage abstraction.
        """
        return {
            "format": self.format_name,
            "mime_type": self.mime_type,
            "file_extension": self.file_extension,
            "file_size_bytes": len(content),
            "checksum_sha256": self.calculate_checksum(content),
            "suggested_filename": file_name or f"survey_report.{self.file_extension}",
        }
