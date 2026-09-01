# BhoomiSync Cloud Storage Configuration Guide (Cloudflare R2)

## 1. Overview

BhoomiSync utilizes Cloudflare R2 through its S3-compatible API for zero-egress-fee, high-throughput storage of high-resolution aerial imagery, point clouds, and geospatial products.

---

## 2. Environment Variables

Configure the following variables in `.env`:
```env
# Cloudflare R2 Credentials (Keep private - never expose to frontend)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-s3-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-s3-secret-access-key
R2_BUCKET_NAME=bhoomisync-drone-data
R2_ENDPOINT_URL=https://<your-account-id>.r2.cloudflarestorage.com
SIMULATED_PROCESSING=True
```

---

## 3. Presigned URL Workflow

1. The drone flight computer requests a temporary presigned upload URL via `POST /api/v1/drone/upload-url`.
2. The backend generates a signed HTTP PUT URL with a 900-second (15 min) expiration window.
3. The drone streams the multi-megabyte image/LiDAR file directly to Cloudflare R2 without burdening the FastAPI server memory.
4. The drone notifies the backend via `POST /api/v1/drone/upload-complete` with size and SHA-256 hash.
