from typing import Any, Optional


class BhoomiSyncException(Exception):
    """Base exception for all BhoomiSync domain errors."""
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Any] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class NotFoundException(BhoomiSyncException):
    """Resource not found error."""
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            code=f"{resource.upper()}_NOT_FOUND",
            message=f"{resource.capitalize()} with identifier '{resource_id}' was not found.",
            status_code=404
        )


class DuplicateResourceException(BhoomiSyncException):
    """Resource already exists error."""
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            code=f"{resource.upper()}_ALREADY_EXISTS",
            message=f"{resource.capitalize()} '{identifier}' already exists in the system.",
            status_code=409
        )


class ValidationException(BhoomiSyncException):
    """Input or geospatial validation error."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=422,
            details=details
        )


class StorageException(BhoomiSyncException):
    """Cloud / Mock storage operation failure."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="STORAGE_ERROR",
            message=message,
            status_code=502,
            details=details
        )


class GatewayException(BhoomiSyncException):
    """Data Gateway acquisition/ingestion error."""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            code="GATEWAY_ERROR",
            message=message,
            status_code=502,
            details=details
        )
