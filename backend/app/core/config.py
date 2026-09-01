from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    BhoomiSync Application Configuration Settings.
    Loads values from environment variables or defaults.
    """
    APP_NAME: str = "BhoomiSync"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./data/bhoomisync_dev.db",
        description="PostgreSQL+PostGIS connection string or local fallback SQLite"
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Cloud Storage Abstraction (MOCK, LOCAL, S3, GCS, AZURE)
    STORAGE_PROVIDER: str = "MOCK"
    STORAGE_BUCKET: str = "bhoomisync-surveys-data"
    STORAGE_LOCAL_ROOT: str = "./data"
    
    # Data Gateway Configuration (ESP32_PHONE, COMPANION_COMPUTER)
    DATA_GATEWAY_TYPE: str = "ESP32_PHONE"
    DATA_GATEWAY_DEVICE_ID: str = "ESP32-PROTO-01"
    
    # Geospatial Engine
    DEFAULT_CRS: str = "EPSG:4326"
    PROJECTED_CRS_ZONE: str = "EPSG:32643"  # UTM Zone 43N (Covers Western & Central India)

    # Authentication & Security (Prompt 6)
    JWT_SECRET_KEY: str = Field(
        default="bhoomisync-super-secret-jwt-key-change-in-production-2026",
        description="Cryptographic secret key for signing JWT tokens"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_HASHING_ALGORITHM: str = "bcrypt"
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    ALLOW_DEV_HEADER_AUTH: bool = True

    # Cloudflare R2 Cloud Storage (Prompt 8)

    R2_ACCOUNT_ID: str = Field(default="", description="Cloudflare Account ID")
    R2_ACCESS_KEY_ID: str = Field(default="", description="Cloudflare R2 S3 Access Key ID")
    R2_SECRET_ACCESS_KEY: str = Field(default="", description="Cloudflare R2 S3 Secret Access Key")
    R2_BUCKET_NAME: str = Field(default="bhoomisync-drone-data", description="Cloudflare R2 Bucket Name")
    R2_ENDPOINT_URL: str = Field(default="", description="Cloudflare R2 S3 API Endpoint URL")
    SIMULATED_PROCESSING: bool = Field(default=True, description="Enable simulated fast processing pipeline for demo & tests")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")



settings = Settings()

