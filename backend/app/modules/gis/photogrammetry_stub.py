from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel


class PhotogrammetryPipelineConfig(BaseModel):
    survey_id: str
    camera_dataset_id: str
    rtk_dataset_id: str
    target_gsd_cm: float = 2.5
    feature_matching_quality: str = "HIGH"
    generate_orthomosaic: bool = True
    generate_dsm: bool = True


class PhotogrammetryProcessingInterface(ABC):
    """
    Interface boundary for Future Photogrammetry Engine
    (Structure-from-Motion, Bundle Adjustment, Dense Stereo Matching, Orthorectification).
    """

    @abstractmethod
    def submit_stitching_job(self, config: PhotogrammetryPipelineConfig) -> Dict[str, Any]:
        """Submits raw camera photos and RTK logs for SfM orthomosaic reconstruction."""
        pass

    @abstractmethod
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Queries processing state (Feature Extraction -> Alignment -> Dense Cloud -> Mesh -> Ortho)."""
        pass


class PhotogrammetryPipelineStub(PhotogrammetryProcessingInterface):
    """Stub implementation documenting future photogrammetry execution pipeline."""

    def submit_stitching_job(self, config: PhotogrammetryPipelineConfig) -> Dict[str, Any]:
        return {
            "job_id": f"JOB-PHOTO-{config.survey_id}",
            "status": "QUEUED_FOR_PHOTOGRAMMETRY",
            "pipeline_stages": [
                "1. EXIF & RTK GPS/IMU Pose Extraction",
                "2. SIFT/SuperPoint Feature Matching",
                "3. Sparse Bundle Adjustment Reconstruction",
                "4. Dense Multi-View Point Cloud Generation",
                "5. True Orthomosaic Geotiff Export (EPSG:4326)"
            ],
            "target_gsd_cm": config.target_gsd_cm,
            "estimated_duration_minutes": 18.5
        }

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        return {
            "job_id": job_id,
            "status": "STUB_READY",
            "progress_percentage": 100.0,
            "current_step": "Orthomosaic raster generated and registered in dataset catalog."
        }
