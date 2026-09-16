"""Core calculation, status determination, and data persistence services."""

from datetime import datetime, timezone
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
from backend.app.config import settings
from backend.app.database import get_db


def calculate_metrics(
    sensor1_pulses: int,
    sensor2_pulses: int,
    pulses_per_liter_s1: Optional[float] = None,
    pulses_per_liter_s2: Optional[float] = None,
    sample_interval_sec: Optional[float] = None,
    loss_threshold_lmin: Optional[float] = None,
    anomaly_tolerance_lmin: Optional[float] = None,
) -> Dict[str, Any]:
    """Calculate flow rates, volumes, difference, ratio, and operational status.

    Formulas:
        volume (L) = pulses / pulses_per_liter
        flow (L/min) = (volume / sample_interval_seconds) * 60.0
        flow_difference = sensor1_flow - sensor2_flow
        flow_ratio = sensor2_flow / sensor1_flow (safely guarded)
    """
    cal_s1 = pulses_per_liter_s1 or settings.PULSES_PER_LITER_S1
    cal_s2 = pulses_per_liter_s2 or settings.PULSES_PER_LITER_S2
    interval = sample_interval_sec or settings.SAMPLE_INTERVAL_SECONDS
    loss_threshold = (
        loss_threshold_lmin
        if loss_threshold_lmin is not None
        else settings.FLOW_DIFFERENCE_THRESHOLD_LMIN
    )
    anomaly_tol = (
        anomaly_tolerance_lmin
        if anomaly_tolerance_lmin is not None
        else settings.ANOMALY_TOLERANCE_LMIN
    )

    # Calculate volumes in Liters for the sample interval
    sensor1_volume = sensor1_pulses / cal_s1 if cal_s1 > 0 else 0.0
    sensor2_volume = sensor2_pulses / cal_s2 if cal_s2 > 0 else 0.0

    # Calculate flow rates in L/min
    sensor1_flow = (sensor1_volume / interval) * 60.0 if interval > 0 else 0.0
    sensor2_flow = (sensor2_volume / interval) * 60.0 if interval > 0 else 0.0

    # Flow difference (upstream - downstream)
    flow_difference = sensor1_flow - sensor2_flow

    # Safe flow ratio calculation
    if sensor1_flow > 0.0:
        flow_ratio = sensor2_flow / sensor1_flow
    elif sensor2_flow == 0.0:
        # Both upstream and downstream are zero flow
        flow_ratio = 1.0
    else:
        # Downstream reporting flow while upstream is zero
        flow_ratio = 0.0

    # Status Determination:
    # 1. SENSOR/CALIBRATION ANOMALY: Negative pulses or downstream reporting higher flow than upstream beyond tolerance
    # 2. POSSIBLE WATER LOSS: Upstream flow exceeds downstream flow beyond threshold
    # 3. NORMAL: System balanced or idle
    if sensor1_pulses < 0 or sensor2_pulses < 0:
        status = "SENSOR/CALIBRATION ANOMALY"
    elif sensor2_flow > (sensor1_flow + anomaly_tol):
        status = "SENSOR/CALIBRATION ANOMALY"
    elif flow_difference > loss_threshold:
        status = "POSSIBLE WATER LOSS"
    else:
        status = "NORMAL"

    return {
        "sensor1_pulses": sensor1_pulses,
        "sensor2_pulses": sensor2_pulses,
        "sensor1_flow": round(sensor1_flow, 4),
        "sensor2_flow": round(sensor2_flow, 4),
        "sensor1_volume": round(sensor1_volume, 6),
        "sensor2_volume": round(sensor2_volume, 6),
        "flow_difference": round(flow_difference, 4),
        "flow_ratio": round(flow_ratio, 4),
        "status": status,
    }


def record_reading(
    sensor1_pulses: int,
    sensor2_pulses: int,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Calculate metrics, persist the reading in SQLite, and return stored data."""
    metrics = calculate_metrics(sensor1_pulses, sensor2_pulses)
    timestamp = datetime.now(timezone.utc).isoformat()

    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sensor_readings (
                timestamp,
                sensor1_pulses,
                sensor2_pulses,
                sensor1_flow,
                sensor2_flow,
                sensor1_volume,
                sensor2_volume,
                flow_difference,
                flow_ratio,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                timestamp,
                metrics["sensor1_pulses"],
                metrics["sensor2_pulses"],
                metrics["sensor1_flow"],
                metrics["sensor2_flow"],
                metrics["sensor1_volume"],
                metrics["sensor2_volume"],
                metrics["flow_difference"],
                metrics["flow_ratio"],
                metrics["status"],
            ),
        )
        record_id = cursor.lastrowid

    return {
        "id": record_id,
        "timestamp": timestamp,
        **metrics,
    }


def get_live_status(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve the latest sensor reading and overall operational status."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM sensor_readings
            ORDER BY id DESC
            LIMIT 1;
            """
        )
        row = cursor.fetchone()

    current_time = datetime.now(timezone.utc).isoformat()
    if row is None:
        return {
            "status": "IDLE",
            "timestamp": current_time,
            "reading": None,
            "message": "No sensor readings recorded yet. Waiting for ESP32 data.",
        }

    reading_dict = dict(row)
    return {
        "status": reading_dict["status"],
        "timestamp": current_time,
        "reading": reading_dict,
        "message": f"Operating normally with status: {reading_dict['status']}",
    }


def get_history(
    limit: int = 100,
    offset: int = 0,
    db_path: Optional[str] = None,
) -> Tuple[int, List[Dict[str, Any]]]:
    """Retrieve historical sensor readings with pagination."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total FROM sensor_readings;")
        total = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT * FROM sensor_readings
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
            """,
            (limit, offset),
        )
        rows = cursor.fetchall()
        readings = [dict(row) for row in rows]

    return total, readings


from backend.app.anomaly import default_anomaly_detector


def get_analytics_summary(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Compute aggregate water usage statistics and status distributions."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()

        # Overall aggregates
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_readings,
                COALESCE(SUM(sensor1_pulses), 0) AS total_pulses_sensor1,
                COALESCE(SUM(sensor2_pulses), 0) AS total_pulses_sensor2,
                COALESCE(SUM(sensor1_volume), 0.0) AS total_volume_sensor1_liters,
                COALESCE(SUM(sensor2_volume), 0.0) AS total_volume_sensor2_liters,
                COALESCE(AVG(sensor1_flow), 0.0) AS average_flow_sensor1_lmin,
                COALESCE(AVG(sensor2_flow), 0.0) AS average_flow_sensor2_lmin
            FROM sensor_readings;
            """
        )
        agg = dict(cursor.fetchone())

        # Status count breakdown
        cursor.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM sensor_readings
            GROUP BY status;
            """
        )
        status_rows = cursor.fetchall()
        status_counts = {
            "NORMAL": 0,
            "POSSIBLE WATER LOSS": 0,
            "SENSOR/CALIBRATION ANOMALY": 0,
        }
        for row in status_rows:
            status_counts[row["status"]] = row["count"]

        # Cumulative volumes
        upstream_vol = round(float(agg["total_volume_sensor1_liters"]), 4)
        downstream_vol = round(float(agg["total_volume_sensor2_liters"]), 4)
        avg_flow_s1 = round(float(agg["average_flow_sensor1_lmin"]), 4)
        avg_flow_s2 = round(float(agg["average_flow_sensor2_lmin"]), 4)

        # Flow difference (upstream - downstream)
        flow_difference = round(avg_flow_s1 - avg_flow_s2, 4)

        # Flow ratio with safe zero division guard
        if avg_flow_s1 > 0.0:
            flow_ratio = round(avg_flow_s2 / avg_flow_s1, 4)
        elif avg_flow_s2 == 0.0:
            flow_ratio = 1.0
        else:
            flow_ratio = 0.0

        # Estimated water loss (upstream volume - downstream volume)
        estimated_water_loss_liters = max(0.0, round(upstream_vol - downstream_vol, 4))

        # Latest status
        cursor.execute(
            "SELECT status FROM sensor_readings ORDER BY id DESC LIMIT 1;"
        )
        latest_row = cursor.fetchone()
        latest_status = latest_row["status"] if latest_row else None

    return {
        "total_readings": agg["total_readings"],
        "total_pulses_sensor1": agg["total_pulses_sensor1"],
        "total_pulses_sensor2": agg["total_pulses_sensor2"],
        "total_volume_sensor1_liters": upstream_vol,
        "total_volume_sensor2_liters": downstream_vol,
        "cumulative_upstream_volume_liters": upstream_vol,
        "cumulative_downstream_volume_liters": downstream_vol,
        "average_flow_sensor1_lmin": avg_flow_s1,
        "average_flow_sensor2_lmin": avg_flow_s2,
        "flow_difference": flow_difference,
        "flow_ratio": flow_ratio,
        "estimated_water_loss_liters": estimated_water_loss_liters,
        "estimated_water_loss": estimated_water_loss_liters,
        "status_counts": status_counts,
        "latest_status": latest_status,
    }


def get_hourly_analytics(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Aggregate real sensor readings by hour from SQLite."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COALESCE(strftime('%Y-%m-%dT%H:00:00', timestamp), substr(timestamp, 1, 13) || ':00:00') AS hour_slot,
                COUNT(*) AS reading_count,
                COALESCE(SUM(sensor1_volume), 0.0) AS upstream_volume_liters,
                COALESCE(SUM(sensor2_volume), 0.0) AS downstream_volume_liters,
                COALESCE(AVG(sensor1_flow), 0.0) AS average_flow_sensor1_lmin,
                COALESCE(AVG(sensor2_flow), 0.0) AS average_flow_sensor2_lmin
            FROM sensor_readings
            GROUP BY hour_slot
            ORDER BY hour_slot ASC;
            """
        )
        rows = cursor.fetchall()

    hourly = []
    for row in rows:
        hour_slot = str(row["hour_slot"])
        upstream_vol = round(float(row["upstream_volume_liters"]), 4)
        downstream_vol = round(float(row["downstream_volume_liters"]), 4)
        avg_flow_s1 = round(float(row["average_flow_sensor1_lmin"]), 4)
        avg_flow_s2 = round(float(row["average_flow_sensor2_lmin"]), 4)
        flow_diff = round(avg_flow_s1 - avg_flow_s2, 4)
        loss = max(0.0, round(upstream_vol - downstream_vol, 4))

        if avg_flow_s1 > 0.0:
            ratio = round(avg_flow_s2 / avg_flow_s1, 4)
        elif avg_flow_s2 == 0.0:
            ratio = 1.0
        else:
            ratio = 0.0

        hourly.append({
            "hour": hour_slot,
            "timestamp": hour_slot,
            "upstream_volume_liters": upstream_vol,
            "downstream_volume_liters": downstream_vol,
            "upstream_volume": upstream_vol,
            "downstream_volume": downstream_vol,
            "average_flow_sensor1_lmin": avg_flow_s1,
            "average_flow_sensor2_lmin": avg_flow_s2,
            "flow_difference": flow_diff,
            "flow_ratio": ratio,
            "estimated_water_loss_liters": loss,
            "estimated_water_loss": loss,
            "reading_count": int(row["reading_count"]),
        })

    return hourly


def get_daily_analytics(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Aggregate real sensor readings by day from SQLite."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                COALESCE(strftime('%Y-%m-%d', timestamp), substr(timestamp, 1, 10)) AS date_slot,
                COUNT(*) AS reading_count,
                COALESCE(SUM(sensor1_volume), 0.0) AS upstream_volume_liters,
                COALESCE(SUM(sensor2_volume), 0.0) AS downstream_volume_liters,
                COALESCE(AVG(sensor1_flow), 0.0) AS average_flow_sensor1_lmin,
                COALESCE(AVG(sensor2_flow), 0.0) AS average_flow_sensor2_lmin
            FROM sensor_readings
            GROUP BY date_slot
            ORDER BY date_slot ASC;
            """
        )
        rows = cursor.fetchall()

    daily = []
    for row in rows:
        date_slot = str(row["date_slot"])
        upstream_vol = round(float(row["upstream_volume_liters"]), 4)
        downstream_vol = round(float(row["downstream_volume_liters"]), 4)
        avg_flow_s1 = round(float(row["average_flow_sensor1_lmin"]), 4)
        avg_flow_s2 = round(float(row["average_flow_sensor2_lmin"]), 4)
        flow_diff = round(avg_flow_s1 - avg_flow_s2, 4)
        loss = max(0.0, round(upstream_vol - downstream_vol, 4))

        if avg_flow_s1 > 0.0:
            ratio = round(avg_flow_s2 / avg_flow_s1, 4)
        elif avg_flow_s2 == 0.0:
            ratio = 1.0
        else:
            ratio = 0.0

        daily.append({
            "date": date_slot,
            "upstream_volume_liters": upstream_vol,
            "downstream_volume_liters": downstream_vol,
            "upstream_volume": upstream_vol,
            "downstream_volume": downstream_vol,
            "estimated_water_loss_liters": loss,
            "estimated_water_loss": loss,
            "average_flow_sensor1_lmin": avg_flow_s1,
            "average_upstream_flow": avg_flow_s1,
            "average_flow_sensor2_lmin": avg_flow_s2,
            "average_downstream_flow": avg_flow_s2,
            "flow_difference": flow_diff,
            "flow_ratio": ratio,
            "reading_count": int(row["reading_count"]),
        })

    return daily


def get_anomalies(
    limit: int = 100,
    offset: int = 0,
    status_filter: Optional[str] = None,
    db_path: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve detected water loss and sensor anomaly events with rule-based evaluation."""
    detector = default_anomaly_detector
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        if status_filter:
            cursor.execute(
                """
                SELECT * FROM sensor_readings
                WHERE status = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?;
                """,
                (status_filter, limit, offset),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM sensor_readings
                WHERE status != 'NORMAL'
                ORDER BY id DESC
                LIMIT ? OFFSET ?;
                """,
                (limit, offset),
            )
        rows = cursor.fetchall()

    anomalies = []
    for row in rows:
        row_dict = dict(row)
        eval_result = detector.evaluate(
            sensor1_flow=row_dict["sensor1_flow"],
            sensor2_flow=row_dict["sensor2_flow"],
            sensor1_pulses=row_dict["sensor1_pulses"],
            sensor2_pulses=row_dict["sensor2_pulses"],
        )
        anomalies.append({
            **row_dict,
            "anomaly_type": eval_result["anomaly_type"],
            "details": eval_result["details"],
        })

    return anomalies


def get_health_status(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Check database health and return record count."""
    try:
        with get_db(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS total FROM sensor_readings;")
            count = cursor.fetchone()["total"]
            db_status = "connected"
    except Exception as e:
        count = 0
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "total_records": count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
