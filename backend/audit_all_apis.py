import asyncio
import httpx
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"
SURVEY_ID = "SUR-2026-001"
MISSION_ID = "MIS-2026-HARIPURA-002"

ENDPOINTS = [
    # System Health
    ("GET", f"{BASE_URL}/health", None, "System Health", "Platform status & engine check"),
    ("GET", f"{BASE_URL}/system/health", None, "System Health", "7-Subsystem deep health check"),
    ("GET", f"{BASE_URL}/ai/huggingface/status", None, "AI & Intelligence", "Hugging Face Inference token & model"),
    ("GET", f"{BASE_URL}/ai/modules", None, "AI & Intelligence", "Registered AI module registry"),
    ("POST", f"{BASE_URL}/ai/boundary/detect", {"survey_id": SURVEY_ID, "confidence_threshold": 0.60}, "AI & Intelligence", "Meta SAM candidate bund detection"),
    ("POST", f"{BASE_URL}/ai/classification/predict", {"survey_id": SURVEY_ID, "confidence_threshold": 0.50}, "AI & Intelligence", "SegFormer LULC segmentation"),
    ("GET", f"{BASE_URL}/surveys", None, "Surveys", "List all survey campaigns"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}", None, "Surveys", "Survey details & coordinates"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/lifecycle", None, "Surveys", "10-stage lifecycle state machine"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/datasets", None, "Surveys", "Survey dataset file manifests"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/lineage", None, "Surveys", "Data provenance & lineage graph"),
    ("GET", f"{BASE_URL}/drone/missions", None, "Drone Mission", "List drone flight missions"),
    ("GET", f"{BASE_URL}/drone/missions/{MISSION_ID}", None, "Drone Mission", "Mission telemetry & status"),
    ("GET", f"{BASE_URL}/drone/missions/{MISSION_ID}/health", None, "Drone Mission", "Real-time drone health & battery"),
    ("GET", f"{BASE_URL}/drone/missions/{MISSION_ID}/telemetry?limit=1", None, "Drone Mission", "10 Hz RTK carrier fix stream"),
    ("GET", f"{BASE_URL}/drone/simulator/status", None, "Drone Mission", "Live flight path simulator"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/spatial-footprint", None, "Geospatial GIS", "Camera shots & RTK track GeoJSON"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/orthomosaic", None, "Geospatial GIS", "2D Orthomosaic metadata & bounds"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/dem", None, "Geospatial GIS", "Bare-Earth DEM elevation raster"),
    ("GET", f"{BASE_URL}/surveys/{SURVEY_ID}/boundaries", None, "Geospatial GIS", "Authoritative parcel boundaries"),
    ("GET", f"{BASE_URL}/gis/status", None, "Geospatial GIS", "GIS spatial projection & engine"),
    ("GET", f"{BASE_URL}/parcels", None, "Land Records", "Khasra search & revenue records"),
    ("GET", f"{BASE_URL}/cadastral/layer", None, "Land Records", "Full cadastral GeoJSON vector layer"),
    ("GET", f"{BASE_URL}/parcels/BS-P-001", None, "Land Records", "Individual parcel detail"),
    ("GET", f"{BASE_URL}/parcels/BS-P-001/ownership", None, "Land Records", "Land owner & encumbrance data"),
    ("GET", f"{BASE_URL}/parcels/BS-P-001/comparison", None, "Land Records", "Drone vs official cadastre diff"),
    ("GET", f"{BASE_URL}/reports", None, "Reporting", "List official revenue reports"),
    ("GET", f"{BASE_URL}/auth/security-stats", None, "Security & RBAC", "Audit logs & security dashboard"),
]

async def test_endpoint(client, method, url, body, category, description):
    start_t = time.time()
    try:
        if method == "POST":
            res = await client.post(url, json=body, timeout=5.0)
        else:
            res = await client.get(url, timeout=5.0)
        latency = round((time.time() - start_t) * 1000, 1)
        return {
            "category": category,
            "method": method,
            "url": url.replace(BASE_URL, ""),
            "description": description,
            "status": res.status_code,
            "latency_ms": latency,
            "passed": 200 <= res.status_code < 300
        }
    except Exception as e:
        latency = round((time.time() - start_t) * 1000, 1)
        return {
            "category": category,
            "method": method,
            "url": url.replace(BASE_URL, ""),
            "description": description,
            "status": 500,
            "latency_ms": latency,
            "passed": False,
            "error": str(e)
        }

async def main():
    async with httpx.AsyncClient() as client:
        tasks = [test_endpoint(client, m, u, b, c, d) for m, u, b, c, d in ENDPOINTS]
        results = await asyncio.gather(*tasks)
    
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    
    print(f"\n{'CATEGORY':<18} | {'METHOD':<6} | {'STATUS':<6} | {'TIME':<8} | {'ENDPOINT'}")
    print("-" * 85)
    for r in sorted(results, key=lambda x: (x["category"], x["url"])):
        mark = "✓" if r["passed"] else "✗"
        print(f"{r['category']:<18} | {r['method']:<6} | {r['status']:<6} | {r['latency_ms']:>6.1f}ms | {mark} {r['url']}")
    
    print("-" * 85)
    print(f"AUDIT SUMMARY: {passed_count}/{total_count} API Endpoints Passed ({(passed_count/total_count)*100:.1f}%)")

if __name__ == "__main__":
    asyncio.run(main())
