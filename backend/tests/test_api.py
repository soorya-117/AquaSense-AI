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


# =====================================================================
# ACCOUNT 3: ANALYTICS & ANOMALY DETECTION TEST SUITE
# =====================================================================

from backend.app.anomaly import RuleBasedAnomalyDetector, MLAnomalyExperiment


def test_analytics_summary_empty_db(client):
    """Test GET /api/analytics/summary on clean empty database."""
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_readings"] == 0
    assert data["total_pulses_sensor1"] == 0
    assert data["total_pulses_sensor2"] == 0
    assert data["total_volume_sensor1_liters"] == 0.0
    assert data["total_volume_sensor2_liters"] == 0.0
    assert data["average_flow_sensor1_lmin"] == 0.0
    assert data["average_flow_sensor2_lmin"] == 0.0
    assert data["flow_difference"] == 0.0
    assert data["flow_ratio"] == 1.0
    assert data["estimated_water_loss_liters"] == 0.0
    assert data["status_counts"]["NORMAL"] == 0
    assert data["status_counts"]["POSSIBLE WATER LOSS"] == 0
    assert data["status_counts"]["SENSOR/CALIBRATION ANOMALY"] == 0
    assert data["latest_status"] is None


def test_known_values_calculation():
    """Test calculations using the exact example values specified in requirements:

    sensor1_flow = 10
    sensor2_flow = 8
    => flow_difference = 2
    => flow_ratio = 0.8
    """
    detector = RuleBasedAnomalyDetector(
        loss_threshold_lmin=0.15,
        anomaly_tolerance_lmin=0.10,
    )
    result = detector.evaluate(sensor1_flow=10.0, sensor2_flow=8.0)

    assert result["flow_difference"] == 2.0
    assert result["flow_ratio"] == 0.8
    assert result["status"] == "POSSIBLE WATER LOSS"


def test_analytics_summary_known_values_via_api(client):
    """Test POST /data and GET /api/analytics/summary with known flows (10 L/min and 8 L/min).

    Since pulses_per_liter = 5880 and interval = 1.0s:
    flow (L/min) = (pulses / 5880) * 60 = pulses / 98
    For flow1 = 10 L/min: pulses1 = 10 * 98 = 980
    For flow2 = 8 L/min: pulses2 = 8 * 98 = 784
    """
    payload = {"sensor1_pulses": 980, "sensor2_pulses": 784}
    res_post = client.post("/data", json=payload)
    assert res_post.status_code == 201
    post_data = res_post.json()

    assert post_data["sensor1_flow"] == 10.0
    assert post_data["sensor2_flow"] == 8.0
    assert post_data["flow_difference"] == 2.0
    assert post_data["flow_ratio"] == 0.8
    assert post_data["status"] == "POSSIBLE WATER LOSS"

    res_summary = client.get("/api/analytics/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["average_flow_sensor1_lmin"] == 10.0
    assert summary["average_flow_sensor2_lmin"] == 8.0
    assert summary["flow_difference"] == 2.0
    assert summary["flow_ratio"] == 0.8
    assert summary["estimated_water_loss_liters"] > 0.0


def test_analytics_summary_cumulative_volumes(client):
    """Test cumulative upstream and downstream volume accumulation and water loss."""
    # Reading 1: 5880 pulses S1 (1.0 L), 2940 pulses S2 (0.5 L)
    client.post("/data", json={"sensor1_pulses": 5880, "sensor2_pulses": 2940})
    # Reading 2: 2940 pulses S1 (0.5 L), 2940 pulses S2 (0.5 L)
    client.post("/data", json={"sensor1_pulses": 2940, "sensor2_pulses": 2940})

    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_readings"] == 2
    assert data["total_volume_sensor1_liters"] == 1.5
    assert data["total_volume_sensor2_liters"] == 1.0
    # Water loss: upstream - downstream = 1.5 - 1.0 = 0.5 L
    assert data["estimated_water_loss_liters"] == 0.5


def test_analytics_hourly_empty_db(client):
    """Test GET /api/analytics/hourly on empty database returns empty list."""
    response = client.get("/api/analytics/hourly")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_analytics_hourly_aggregation(client):
    """Test GET /api/analytics/hourly aggregates real readings by hour."""
    # Insert readings directly into SQLite with different hours
    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    # 2 readings in 09:00 hour slot
    cursor.execute(
        """
        INSERT INTO sensor_readings (
            timestamp, sensor1_pulses, sensor2_pulses, sensor1_flow, sensor2_flow,
            sensor1_volume, sensor2_volume, flow_difference, flow_ratio, status
        ) VALUES
        ('2026-09-16T09:10:00+00:00', 980, 784, 10.0, 8.0, 0.1667, 0.1333, 2.0, 0.8, 'POSSIBLE WATER LOSS'),
        ('2026-09-16T09:40:00+00:00', 980, 784, 10.0, 8.0, 0.1667, 0.1333, 2.0, 0.8, 'POSSIBLE WATER LOSS');
        """
    )
    # 1 reading in 10:00 hour slot
    cursor.execute(
        """
        INSERT INTO sensor_readings (
            timestamp, sensor1_pulses, sensor2_pulses, sensor1_flow, sensor2_flow,
            sensor1_volume, sensor2_volume, flow_difference, flow_ratio, status
        ) VALUES
        ('2026-09-16T10:15:00+00:00', 490, 490, 5.0, 5.0, 0.0833, 0.0833, 0.0, 1.0, 'NORMAL');
        """
    )
    conn.commit()
    conn.close()

    response = client.get("/api/analytics/hourly")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2

    # Hour slot 1: 09:00
    slot0 = data[0]
    assert "2026-09-16T09:00:00" in slot0["hour"]
    assert slot0["reading_count"] == 2
    assert slot0["average_flow_sensor1_lmin"] == 10.0
    assert slot0["average_flow_sensor2_lmin"] == 8.0
    assert slot0["flow_difference"] == 2.0
    assert slot0["flow_ratio"] == 0.8
    assert slot0["upstream_volume_liters"] > 0
    assert slot0["estimated_water_loss_liters"] > 0

    # Hour slot 2: 10:00
    slot1 = data[1]
    assert "2026-09-16T10:00:00" in slot1["hour"]
    assert slot1["reading_count"] == 1
    assert slot1["average_flow_sensor1_lmin"] == 5.0
    assert slot1["average_flow_sensor2_lmin"] == 5.0
    assert slot1["flow_difference"] == 0.0
    assert slot1["flow_ratio"] == 1.0


def test_analytics_daily_empty_db(client):
    """Test GET /api/analytics/daily on empty database returns empty list."""
    response = client.get("/api/analytics/daily")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_analytics_daily_aggregation(client):
    """Test GET /api/analytics/daily aggregates real readings by day."""
    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO sensor_readings (
            timestamp, sensor1_pulses, sensor2_pulses, sensor1_flow, sensor2_flow,
            sensor1_volume, sensor2_volume, flow_difference, flow_ratio, status
        ) VALUES
        ('2026-09-15T14:00:00+00:00', 5880, 2940, 10.0, 5.0, 1.0, 0.5, 5.0, 0.5, 'POSSIBLE WATER LOSS'),
        ('2026-09-16T08:00:00+00:00', 5880, 5880, 10.0, 10.0, 1.0, 1.0, 0.0, 1.0, 'NORMAL');
        """
    )
    conn.commit()
    conn.close()

    response = client.get("/api/analytics/daily")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2

    # Day 1: 2026-09-15
    day1 = data[0]
    assert day1["date"] == "2026-09-15"
    assert day1["reading_count"] == 1
    assert day1["upstream_volume_liters"] == 1.0
    assert day1["downstream_volume_liters"] == 0.5
    assert day1["estimated_water_loss_liters"] == 0.5
    assert day1["average_flow_sensor1_lmin"] == 10.0
    assert day1["average_flow_sensor2_lmin"] == 5.0

    # Day 2: 2026-09-16
    day2 = data[1]
    assert day2["date"] == "2026-09-16"
    assert day2["reading_count"] == 1
    assert day2["upstream_volume_liters"] == 1.0
    assert day2["downstream_volume_liters"] == 1.0
    assert day2["estimated_water_loss_liters"] == 0.0


def test_anomalies_empty_db(client):
    """Test GET /api/anomalies on empty database returns empty list."""
    response = client.get("/api/anomalies")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_anomalies_normal_readings_not_flagged(client):
    """Test that balanced normal and idle readings are not included in anomalies."""
    client.post("/data", json={"sensor1_pulses": 0, "sensor2_pulses": 0})
    client.post("/data", json={"sensor1_pulses": 50, "sensor2_pulses": 50})

    response = client.get("/api/anomalies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_anomalies_possible_water_loss(client):
    """Test that upstream > downstream beyond loss threshold is listed in anomalies."""
    client.post("/data", json={"sensor1_pulses": 100, "sensor2_pulses": 70})

    response = client.get("/api/anomalies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    anomaly = data[0]
    assert anomaly["status"] == "POSSIBLE WATER LOSS"
    assert anomaly["anomaly_type"] == "POSSIBLE WATER LOSS"
    assert anomaly["flow_difference"] > 0.15
    assert "Upstream flow exceeds downstream flow" in anomaly["details"]


def test_anomalies_downstream_greater_than_upstream(client):
    """Test that downstream > upstream beyond tolerance is listed as SENSOR/CALIBRATION ANOMALY."""
    client.post("/data", json={"sensor1_pulses": 50, "sensor2_pulses": 120})

    response = client.get("/api/anomalies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    anomaly = data[0]
    assert anomaly["status"] == "SENSOR/CALIBRATION ANOMALY"
    assert anomaly["anomaly_type"] == "SENSOR/CALIBRATION ANOMALY"
    assert "exceeds upstream" in anomaly["details"]


def test_anomalies_status_filter_and_pagination(client):
    """Test filtering anomalies by status and pagination limits."""
    # 1: Normal
    client.post("/data", json={"sensor1_pulses": 50, "sensor2_pulses": 50})
    # 2: Loss
    client.post("/data", json={"sensor1_pulses": 100, "sensor2_pulses": 70})
    # 3: Sensor anomaly
    client.post("/data", json={"sensor1_pulses": 30, "sensor2_pulses": 90})
    # 4: Another Loss
    client.post("/data", json={"sensor1_pulses": 120, "sensor2_pulses": 80})

    # All anomalies (should be 3 records)
    res_all = client.get("/api/anomalies")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 3

    # Filter only POSSIBLE WATER LOSS
    res_loss = client.get("/api/anomalies?status=POSSIBLE+WATER+LOSS")
    assert res_loss.status_code == 200
    loss_data = res_loss.json()
    assert len(loss_data) == 2
    for r in loss_data:
        assert r["status"] == "POSSIBLE WATER LOSS"

    # Filter only SENSOR/CALIBRATION ANOMALY
    res_cal = client.get("/api/anomalies?status=SENSOR%2FCALIBRATION+ANOMALY")
    assert res_cal.status_code == 200
    cal_data = res_cal.json()
    assert len(cal_data) == 1
    assert cal_data[0]["status"] == "SENSOR/CALIBRATION ANOMALY"

    # Pagination: limit=1, offset=0
    res_paginated = client.get("/api/anomalies?limit=1&offset=0")
    assert res_paginated.status_code == 200
    assert len(res_paginated.json()) == 1


def test_rule_detector_configurable_thresholds():
    """Test that RuleBasedAnomalyDetector uses configurable thresholds, never hardcoded."""
    strict_detector = RuleBasedAnomalyDetector(
        loss_threshold_lmin=0.05,
        anomaly_tolerance_lmin=0.02,
    )
    lenient_detector = RuleBasedAnomalyDetector(
        loss_threshold_lmin=0.50,
        anomaly_tolerance_lmin=0.30,
    )

    # A flow difference of 0.10 L/min:
    # Under strict (0.05 threshold) -> POSSIBLE WATER LOSS
    # Under lenient (0.50 threshold) -> NORMAL
    strict_eval = strict_detector.evaluate(sensor1_flow=1.0, sensor2_flow=0.90)
    lenient_eval = lenient_detector.evaluate(sensor1_flow=1.0, sensor2_flow=0.90)

    assert strict_eval["status"] == "POSSIBLE WATER LOSS"
    assert lenient_eval["status"] == "NORMAL"


def test_zero_flow_conditions():
    """Test zero upstream flow, zero downstream flow, and both zero flow."""
    detector = RuleBasedAnomalyDetector()

    # Both zero -> NORMAL, ratio = 1.0
    res_both_zero = detector.evaluate(sensor1_flow=0.0, sensor2_flow=0.0)
    assert res_both_zero["status"] == "NORMAL"
    assert res_both_zero["flow_ratio"] == 1.0
    assert res_both_zero["flow_difference"] == 0.0

    # Downstream flow while upstream is zero -> SENSOR/CALIBRATION ANOMALY, ratio = 0.0
    res_down_only = detector.evaluate(sensor1_flow=0.0, sensor2_flow=1.0)
    assert res_down_only["status"] == "SENSOR/CALIBRATION ANOMALY"
    assert res_down_only["flow_ratio"] == 0.0

    # Upstream flow while downstream is zero -> POSSIBLE WATER LOSS
    res_up_only = detector.evaluate(sensor1_flow=1.0, sensor2_flow=0.0)
    assert res_up_only["status"] == "POSSIBLE WATER LOSS"
    assert res_up_only["flow_ratio"] == 0.0
    assert res_up_only["flow_difference"] == 1.0


def test_ml_experiment_scaffold_no_fake_data():
    """Test MLAnomalyExperiment scaffold does not fabricate data and falls back gracefully."""
    experiment = MLAnomalyExperiment()
    # Try training with 0 samples (insufficient real data)
    result = experiment.train_or_fit([])
    assert result["status"] in ("insufficient_data", "unavailable")
    assert result["samples_used"] == 0

    # Predict always gives deterministic rule-based result without requiring ML model
    pred = experiment.predict(sensor1_flow=10.0, sensor2_flow=8.0)
    assert pred["status"] == "POSSIBLE WATER LOSS"
    assert pred["flow_difference"] == 2.0
    assert pred["flow_ratio"] == 0.8
