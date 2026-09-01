def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "HEALTHY"
    assert data["data"]["gateway_type"] in ("ESP32_PHONE", "COMPANION_COMPUTER")


def test_list_surveys(client):
    response = client.get("/api/surveys")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1
    assert data["data"][0]["survey_id"] == "SUR-2026-001"


def test_get_survey_detail(client):
    response = client.get("/api/surveys/SUR-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["survey_id"] == "SUR-2026-001"
    assert "Haripura" in data["data"]["name"]


def test_get_survey_not_found(client):
    response = client.get("/api/surveys/SUR-NON-EXISTENT")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "SURVEY_NOT_FOUND"


def test_create_survey(client):
    payload = {
        "survey_id": "SUR-2026-002",
        "name": "Kailashpuri Village Drone Mapping",
        "location": "Kailashpuri, Udaipur",
        "district": "Udaipur",
        "state": "Rajasthan",
        "status": "PLANNED",
        "center_latitude": 24.7500,
        "center_longitude": 73.7200,
        "total_area_hectares": 15.5
    }
    response = client.post("/api/surveys", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["survey_id"] == "SUR-2026-002"


def test_get_survey_datasets(client):
    response = client.get("/api/surveys/SUR-2026-001/datasets")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    dataset_ids = [d["dataset_id"] for d in data["data"]]
    assert "DS-2026-001-CAM" in dataset_ids
    assert "DS-2026-001-LID" in dataset_ids
    assert "DS-2026-001-RTK" in dataset_ids
    assert "DS-2026-001-ORTHO" in dataset_ids


def test_get_dataset_detail_and_files(client):
    response = client.get("/api/datasets/DS-2026-001-CAM")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["dataset_id"] == "DS-2026-001-CAM"
    assert len(data["data"]["files"]) >= 1
    assert data["data"]["files"][0]["storage_provider"] == "MOCK"


def test_get_survey_parcels(client):
    response = client.get("/api/surveys/SUR-2026-001/parcels")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 5
    parcel = data["data"][0]
    assert parcel["area_m2"] > 0
    assert parcel["perimeter_m"] > 0
    assert parcel["geometry_geojson"]["type"] == "Polygon"


def test_get_survey_lineage(client):
    response = client.get("/api/surveys/SUR-2026-001/lineage")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["nodes"]) >= 4
    assert len(data["data"]["edges"]) >= 3


def test_ai_modules_list(client):
    response = client.get("/api/ai/modules")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_modules"] >= 3


def test_gis_status(client):
    response = client.get("/api/gis/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "OPERATIONAL"
    assert "EPSG:4326" in data["data"]["default_crs"]


def test_comparison_status(client):
    response = client.get("/api/comparison/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "OPERATIONAL"


def test_survey_comparison_report(client):
    response = client.get("/api/comparison/surveys/SUR-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_parcels_compared"] == 5
    assert data["data"]["encroachment_alerts_count"] == 1
