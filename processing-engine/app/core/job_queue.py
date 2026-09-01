"""
Job Queue — in-memory implementation (swap for Redis/Celery in production).
"""
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Callable
from enum import Enum


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Job:
    def __init__(self, job_type: str, survey_id: str, payload: Dict[str, Any]):
        self.job_id = f"JOB-{uuid.uuid4().hex[:12].upper()}"
        self.job_type = job_type
        self.survey_id = survey_id
        self.payload = payload
        self.status = JobStatus.QUEUED
        self.progress_pct = 0
        self.current_stage = "QUEUED"
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.started_at: Optional[str] = None
        self.completed_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "job_type": self.job_type,
            "survey_id": self.survey_id,
            "status": self.status,
            "progress_pct": self.progress_pct,
            "current_stage": self.current_stage,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
        }


# Global in-memory job store — replace with Redis in production
_jobs: Dict[str, Job] = {}


def create_job(job_type: str, survey_id: str, payload: Dict[str, Any]) -> Job:
    job = Job(job_type, survey_id, payload)
    _jobs[job.job_id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def list_jobs(survey_id: Optional[str] = None) -> list:
    jobs = list(_jobs.values())
    if survey_id:
        jobs = [j for j in jobs if j.survey_id == survey_id]
    return [j.to_dict() for j in jobs]


def update_job(job_id: str, **kwargs):
    job = _jobs.get(job_id)
    if job:
        for k, v in kwargs.items():
            setattr(job, k, v)
