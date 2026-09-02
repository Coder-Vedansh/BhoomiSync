"""
Client service for delegating photogrammetry, LULC, and boundary detection
to the standalone BhoomiSync Processing Engine microservice.
"""
import logging
from typing import Dict, Any, Optional, List
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ExternalEngineClient:
    """
    HTTP Client that talks to the standalone Processing Engine server.
    Gracefully falls back to local simulation if the remote engine is offline or unreachable.
    """

    def __init__(self, base_url: Optional[str] = None, secret_key: Optional[str] = None):
        self.base_url = (base_url or settings.PROCESSING_ENGINE_URL).rstrip("/")
        self.secret_key = secret_key or settings.PROCESSING_ENGINE_SECRET
        self.timeout = 30.0

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "User-Agent": "BhoomiSync-Workstation/1.0",
        }

    async def check_engine_health(self) -> Dict[str, Any]:
        """Check if remote engine microservice is online and healthy."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"{self.base_url}/health", headers=self.headers)
                if res.status_code == 200:
                    return {"online": True, "details": res.json()}
        except Exception as e:
            logger.info(f"Remote processing engine offline at {self.base_url}: {e}")
        return {"online": False, "details": "Engine server unreachable, operating in local simulation mode"}

    async def submit_photogrammetry_job(
        self,
        survey_id: str,
        image_urls: List[str] = None,
        target_gsd_cm: float = 2.5,
        target_dem_res_m: float = 0.5,
    ) -> Optional[Dict[str, Any]]:
        """Submit a photogrammetry reconstruction job to remote engine."""
        payload = {
            "survey_id": survey_id,
            "image_urls": image_urls or [],
            "target_gsd_cm": target_gsd_cm,
            "target_dem_res_m": target_dem_res_m,
            "generate_dsm": True,
            "generate_point_cloud": True,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{self.base_url}/photogrammetry/process",
                    json=payload,
                    headers=self.headers,
                )
                if res.status_code in (200, 201, 202):
                    return res.json()
        except Exception as e:
            logger.warning(f"Failed to submit photogrammetry job to external engine: {e}")
        return None

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Poll job status from remote engine."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(
                    f"{self.base_url}/photogrammetry/jobs/{job_id}",
                    headers=self.headers,
                )
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(f"Failed to poll external engine job {job_id}: {e}")
        return None

    async def detect_boundaries(
        self, survey_id: str, confidence_threshold: float = 0.60
    ) -> Optional[Dict[str, Any]]:
        """Request AI boundary detection from remote engine."""
        payload = {
            "survey_id": survey_id,
            "confidence_threshold": confidence_threshold,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{self.base_url}/ai/boundary-detect",
                    json=payload,
                    headers=self.headers,
                )
        except Exception as e:
            logger.warning(f"External engine boundary detection unavailable: {e}")
        return None

    async def fetch_tile(self, survey_id: str, z: int, x: int, y: int) -> Optional[bytes]:
        """Fetch rendered orthomosaic tile from remote engine."""
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{self.base_url}/tiles/{survey_id}/{z}/{x}/{y}.png",
                    headers=self.headers,
                )
                if res.status_code == 200:
                    return res.content
        except Exception:
            pass
        return None

    async def cancel_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Cancel a running photogrammetry job on remote engine."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/photogrammetry/jobs/{job_id}/cancel",
                    headers=self.headers,
                )
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning(f"Failed to cancel external engine job {job_id}: {e}")
        return None


# Global client instance
external_engine_client = ExternalEngineClient()

