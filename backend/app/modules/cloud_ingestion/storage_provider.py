import os
import io
import hashlib
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, BinaryIO
from datetime import datetime
from pydantic import BaseModel
from app.core.config import settings
from app.core.exceptions import StorageException


class StorageObjectMetadata(BaseModel):
    storage_key: str
    bucket: str
    filename: str
    file_size_bytes: int
    content_type: str
    checksum_sha256: str
    created_at: datetime
    custom_metadata: Dict[str, Any] = {}


class CloudStorageProvider(ABC):
    """
    Abstract Cloud Storage Provider Interface.
    Decouples BhoomiSync from specific cloud object stores (S3, GCS, Azure Blob, or local mock).
    """

    @abstractmethod
    def upload_file(
        self,
        file_obj: BinaryIO,
        destination_key: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, Any]] = None
    ) -> StorageObjectMetadata:
        """Upload a file stream to object storage."""
        pass

    @abstractmethod
    def download_file(self, storage_key: str) -> bytes:
        """Download raw binary content from object storage."""
        pass

    @abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        """Delete an object from storage."""
        pass

    @abstractmethod
    def list_files(self, prefix: str = "") -> List[StorageObjectMetadata]:
        """List files matching prefix."""
        pass

    @abstractmethod
    def get_file_metadata(self, storage_key: str) -> StorageObjectMetadata:
        """Retrieve metadata for a stored file without downloading full payload."""
        pass

    @abstractmethod
    def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600) -> str:
        """Generate a secure pre-signed download URL."""
        pass


class MockStorageProvider(CloudStorageProvider):
    """
    Mock & Local Filesystem Storage Provider.
    Used for local development, tests, and air-gapped field deployments.
    """

    def __init__(self, base_directory: str = "./data", bucket_name: str = "bhoomisync-surveys-data"):
        self.base_dir = os.path.abspath(base_directory)
        self.bucket = bucket_name
        self._in_memory_index: Dict[str, StorageObjectMetadata] = {}
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, storage_key: str) -> str:
        clean_key = storage_key.lstrip("/").replace("\\", "/")
        return os.path.join(self.base_dir, clean_key)

    def upload_file(
        self,
        file_obj: BinaryIO,
        destination_key: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, Any]] = None
    ) -> StorageObjectMetadata:
        try:
            full_path = self._resolve_path(destination_key)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            content = file_obj.read()
            if isinstance(content, str):
                content = content.encode("utf-8")
                
            with open(full_path, "wb") as f:
                f.write(content)
                
            checksum = hashlib.sha256(content).hexdigest()
            meta = StorageObjectMetadata(
                storage_key=destination_key,
                bucket=self.bucket,
                filename=os.path.basename(destination_key),
                file_size_bytes=len(content),
                content_type=content_type,
                checksum_sha256=checksum,
                created_at=datetime.utcnow(),
                custom_metadata=metadata or {}
            )
            self._in_memory_index[destination_key] = meta
            return meta
        except Exception as e:
            raise StorageException(f"Failed to upload file to mock storage: {str(e)}")

    def download_file(self, storage_key: str) -> bytes:
        full_path = self._resolve_path(storage_key)
        if not os.path.exists(full_path):
            raise StorageException(f"File key '{storage_key}' not found in storage provider.")
        with open(full_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_key: str) -> bool:
        full_path = self._resolve_path(storage_key)
        if os.path.exists(full_path):
            os.remove(full_path)
            self._in_memory_index.pop(storage_key, None)
            return True
        return False

    def list_files(self, prefix: str = "") -> List[StorageObjectMetadata]:
        results = []
        for key, meta in self._in_memory_index.items():
            if key.startswith(prefix):
                results.append(meta)
        return results

    def get_file_metadata(self, storage_key: str) -> StorageObjectMetadata:
        if storage_key in self._in_memory_index:
            return self._in_memory_index[storage_key]
            
        full_path = self._resolve_path(storage_key)
        if os.path.exists(full_path):
            size = os.path.getsize(full_path)
            with open(full_path, "rb") as f:
                checksum = hashlib.sha256(f.read()).hexdigest()
            return StorageObjectMetadata(
                storage_key=storage_key,
                bucket=self.bucket,
                filename=os.path.basename(storage_key),
                file_size_bytes=size,
                content_type="application/octet-stream",
                checksum_sha256=checksum,
                created_at=datetime.utcfromtimestamp(os.path.getctime(full_path))
            )
        raise StorageException(f"Metadata for key '{storage_key}' could not be located.")

    def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600) -> str:
        return f"/api/storage/mock-download?key={storage_key}"


# Future providers (S3, Azure Blob, GCS) will inherit from CloudStorageProvider
class S3StorageProvider(CloudStorageProvider):
    """Placeholder stub for AWS S3 Storage Provider (to be implemented in future phase)."""
    def upload_file(self, file_obj, destination_key, content_type="application/octet-stream", metadata=None):
        raise NotImplementedError("AWS S3 Storage Provider will be integrated in production phase.")
    def download_file(self, storage_key: str):
        raise NotImplementedError()
    def delete_file(self, storage_key: str):
        raise NotImplementedError()
    def list_files(self, prefix: str = ""):
        raise NotImplementedError()
    def get_file_metadata(self, storage_key: str):
        raise NotImplementedError()
    def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600):
        raise NotImplementedError()


# Storage Provider Factory Singleton
_provider_instance: Optional[CloudStorageProvider] = None


def get_storage_provider() -> CloudStorageProvider:
    """Returns configured CloudStorageProvider implementation."""
    global _provider_instance
    if _provider_instance is None:
        provider_name = settings.STORAGE_PROVIDER.upper()
        if provider_name in ("MOCK", "LOCAL"):
            _provider_instance = MockStorageProvider(
                base_directory=settings.STORAGE_LOCAL_ROOT,
                bucket_name=settings.STORAGE_BUCKET
            )
        elif provider_name == "S3":
            _provider_instance = S3StorageProvider()
        else:
            _provider_instance = MockStorageProvider()
    return _provider_instance
