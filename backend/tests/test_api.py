"""Comprehensive automated test suite for AquaSense AI backend."""

import os
from pathlib import Path
import sqlite3
import pytest
from fastapi.testclient import TestClient

# Use a separate test database file
TEST_DB_PATH = str(Path(__file__).parent / "test_aquasense.db")
os.environ["AQUASENSE_DB_PATH"] = TEST_DB_PATH

from backend.app.config import settings
settings.DB_PATH = TEST_DB_PATH

from backend.app.database import init_db
from backend.app.main import app


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    """Fixture to ensure clean database for each test session."""
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except PermissionError:
            pass
    init_db(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except PermissionError:
            pass


@pytest.fixture
def client():
    """Create FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client):
    """Test root endpoint metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "AquaSense AI"
    assert data["status"] == "online"


def test_docs_available(client):
    """Test that FastAPI /docs and /redoc are accessible."""
    response = client.get("/docs")
    assert response.status_code == 200
    response_redoc = client.get("/redoc")
    assert response_redoc.status_code == 200


def test_health_check_empty_db(client):
    """Test health check before any readings."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["total_records"] == 0


def test_live_status_empty_db(client):
    """Test GET /api/live when database has no readings yet."""
    response = client.get("/api/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "IDLE"
    assert data["reading"] is None


def test_post_data_sample_payload(client):
    """Test POST /data with the user's specified sample payload."""
    payload = {
        "sensor1_pulses": 100,
        "sensor2_pulses": 80,
    }
    response = client.post("/data", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert data["id"] == 1
    assert "timestamp" in data
    assert data["sensor1_pulses"] == 100
    assert data["sensor2_pulses"] == 80
    assert data["sensor1_flow"] > 0
    assert data["sensor2_flow"] > 0
    assert data["sensor1_volume"] > 0
    assert data["sensor2_volume"] > 0
    assert data["flow_difference"] > 0
    # Expected flow difference: (100 - 80) / 5880 * 60 = 20 * 60 / 5880 ~= 0.2041 L/min > 0.15 threshold
    assert data["status"] == "POSSIBLE WATER LOSS"
    assert data["flow_ratio"] == round(data["sensor2_flow"] / data["sensor1_flow"], 4)

    # Verify directly from SQLite
    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_readings WHERE id = 1;")
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    # Verify values in row: id, timestamp, sensor1_pulses, sensor2_pulses
    assert row[2] == 100  # sensor1_pulses
    assert row[3] == 80   # sensor2_pulses
    assert row[10] == "POSSIBLE WATER LOSS"


def test_live_status_after_ingestion(client):
    """Test GET /api/live after submitting a reading."""
    payload = {"sensor1_pulses": 100, "sensor2_pulses": 80}
    client.post("/data", json=payload)

    response = client.get("/api/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "POSSIBLE WATER LOSS"
    assert data["reading"]["sensor1_pulses"] == 100
    assert data["reading"]["sensor2_pulses"] == 80


def test_history_endpoint(client):
    """Test GET /api/history pagination and order."""
    # Post 3 readings
    client.post("/data", json={"sensor1_pulses": 50, "sensor2_pulses": 50})
    client.post("/data", json={"sensor1_pulses": 100, "sensor2_pulses": 80})
    client.post("/data", json={"sensor1_pulses": 70, "sensor2_pulses": 70})

    response = client.get("/api/history?limit=2&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["readings"]) == 2
    # Latest reading should be first (id=3)
    assert data["readings"][0]["id"] == 3
    assert data["readings"][1]["id"] == 2


def test_analytics_summary(client):
    """Test GET /api/analytics/summary calculations and aggregations."""
    # Reading 1: Normal idle
    client.post("/data", json={"sensor1_pulses": 0, "sensor2_pulses": 0})
    # Reading 2: Possible water loss
    client.post("/data", json={"sensor1_pulses": 100, "sensor2_pulses": 70})
    # Reading 3: Normal matched flow
    client.post("/data", json={"sensor1_pulses": 90, "sensor2_pulses": 90})

    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_readings"] == 3
    assert data["total_pulses_sensor1"] == 190
    assert data["total_pulses_sensor2"] == 160
    assert data["total_volume_sensor1_liters"] > 0
    assert data["status_counts"]["POSSIBLE WATER LOSS"] == 1
    assert data["status_counts"]["NORMAL"] == 2
    assert data["latest_status"] == "NORMAL"


def test_sensor_anomaly_status(client):
    """Test downstream flow higher than upstream beyond anomaly margin."""
    # Sensor 2 has 120 pulses while Sensor 1 has only 60 pulses
    payload = {"sensor1_pulses": 60, "sensor2_pulses": 120}
    response = client.post("/data", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "SENSOR/CALIBRATION ANOMALY"


def test_negative_pulses_anomaly(client):
    """Test negative pulses trigger SENSOR/CALIBRATION ANOMALY."""
    payload = {"sensor1_pulses": -10, "sensor2_pulses": 50}
    response = client.post("/data", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "SENSOR/CALIBRATION ANOMALY"


def test_zero_division_guard(client):
    """Test zero pulses produces safe ratio without dividing by zero."""
    payload = {"sensor1_pulses": 0, "sensor2_pulses": 0}
    response = client.post("/data", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["sensor1_flow"] == 0.0
    assert data["sensor2_flow"] == 0.0
    assert data["flow_ratio"] == 1.0
    assert data["status"] == "NORMAL"


def test_cors_headers(client):
    """Test CORS headers for React frontend origin."""
    response = client.options(
        "/api/live",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin")
        == "http://localhost:5173"
    )
