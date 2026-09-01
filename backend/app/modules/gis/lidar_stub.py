from abc import ABC, abstractmethod
from typing import Dict, Any
from pydantic import BaseModel


class LidarProcessingConfig(BaseModel):
    survey_id: str
    lidar_dataset_id: str
    rtk_trajectory_dataset_id: str
    ground_filter_algorithm: str = "CSF_CLOTH_SIMULATION"
    grid_resolution_m: float = 0.1
    generate_dem: bool = True
    generate_dsm: bool = True
    calculate_canopy_height: bool = True


class LidarProcessingInterface(ABC):
    """
    Interface boundary for Future LiDAR & Point Cloud Processing Engine
    (Boresight Calibration, Trajectory Georeferencing, Ground Classification, DEM/DSM Generation).
    """

    @abstractmethod
    def submit_lidar_job(self, config: LidarProcessingConfig) -> Dict[str, Any]:
        """Submits raw LAS/LAZ point cloud and trajectory logs for terrain modeling."""
        pass

    @abstractmethod
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Queries LiDAR filtering and rasterization progress."""
        pass


class LidarProcessingPipelineStub(LidarProcessingInterface):
    """Stub implementation documenting future LiDAR processing pipeline."""

    def submit_lidar_job(self, config: LidarProcessingConfig) -> Dict[str, Any]:
        return {
            "job_id": f"JOB-LIDAR-{config.survey_id}",
            "status": "QUEUED_FOR_LIDAR_PROCESSING",
            "pipeline_stages": [
                "1. Direct Georeferencing with RTK/IMU Trajectory",
                "2. Noise & Outlier Filtering (SOR Algorithm)",
                "3. Cloth Simulation Filter (CSF) Ground Classification",
                "4. Bare-Earth Digital Elevation Model (DEM) Interpolation (TIN/IDW)",
                "5. Digital Surface Model (DSM) & Canopy Height Model (CHM) Generation"
            ],
            "grid_resolution_m": config.grid_resolution_m,
            "estimated_duration_minutes": 12.0
        }

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        return {
            "job_id": job_id,
            "status": "STUB_READY",
            "progress_percentage": 100.0,
            "current_step": "DEM & DSM rasters georeferenced and indexed in dataset repository."
        }
