from typing import Generic, TypeVar, Optional, Any, Dict
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ApiResponse(BaseModel, Generic[T]):
    """Standard unified response wrapper for BhoomiSync API."""
    success: bool = True
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    meta: Optional[dict] = Field(default_factory=dict)


def success_response(data: Any = None, meta: Optional[dict] = None) -> ApiResponse[Any]:
    return ApiResponse(
        success=True,
        data=data,
        error=None,
        meta=meta or {}
    )


def error_response(code: str, message: str, details: Optional[Any] = None) -> ApiResponse[None]:
    return ApiResponse(
        success=False,
        data=None,
        error=ErrorDetail(code=code, message=message, details=details),
        meta={}
    )


class StandardResponse:
    """Compatibility wrapper providing static helper methods."""
    @staticmethod
    def success_response(data: Any = None, message: Optional[str] = None, meta: Optional[dict] = None) -> ApiResponse[Any]:
        m = meta or {}
        if message:
            m["message"] = message
        return ApiResponse(
            success=True,
            data=data,
            error=None,
            meta=m
        )

    @staticmethod
    def error_response(code: str, message: str, details: Optional[Any] = None) -> ApiResponse[None]:
        return error_response(code=code, message=message, details=details)
