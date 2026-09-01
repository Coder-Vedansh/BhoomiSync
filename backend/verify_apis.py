import urllib.request
import json

base = "http://127.0.0.1:8000/api/v1"
endpoints = [
    "/surveys/SUR-2026-001/processing/status",
    "/surveys/SUR-2026-001/processing/jobs",
    "/surveys/SUR-2026-001/orthomosaic",
    "/surveys/SUR-2026-001/dem",
    "/surveys/SUR-2026-001/dsm",
    "/surveys/SUR-2026-001/point-cloud",
    "/surveys/SUR-2026-001/spatial-layers",
    "/surveys/SUR-2026-001/boundaries",
    "/parcels/PRC-SUR-2026-001-01/measurements",
]

print("--- Testing BhoomiSync Prompt 3 APIs ---")
for ep in endpoints:
    url = base + ep
    req = urllib.request.urlopen(url)
    res = json.loads(req.read().decode("utf-8"))
    status = "SUCCESS" if res.get("success") else "FAILED"
    print(f"[{status}] {ep}")

print("\n--- Testing Pipeline Trigger POST ---")
post_req = urllib.request.Request(
    f"{base}/surveys/SUR-2026-001/processing/start",
    data=json.dumps({"survey_id": "SUR-2026-001", "target_gsd_cm": 2.5}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)
post_res = json.loads(urllib.request.urlopen(post_req).read().decode("utf-8"))
print(f"[SUCCESS] Pipeline Started -> Overall Status: {post_res.get('data', {}).get('overall_status')}")
