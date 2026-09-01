import os
from pydantic_settings import BaseSettings


class EngineSettings(BaseSettings):
    # Auth
    ENGINE_SECRET_KEY: str = "bhoomisync-engine-dev-secret"

    # Storage
    STORAGE_PATH: str = "./data"

    # ODM / Photogrammetry
    ODM_ENABLED: bool = False           # Set True when OpenDroneMap is installed
    ODM_URL: str = "http://localhost:3000"  # NodeODM endpoint

    # Redis job queue (optional)
    REDIS_URL: str = ""                 # Leave empty to use in-memory queue

    # Tile server
    TILE_SERVER_BASE_URL: str = "http://localhost:9000/tiles"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 9000
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"


settings = EngineSettings()
