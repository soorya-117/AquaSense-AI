"""API route handlers for AquaSense AI."""

from typing import Optional
from fastapi import APIRouter, Query, status
from backend.app.schemas import (
    AnalyticsSummaryResponse,
    AnomalyRecordResponse,
    DailyAnalyticsItem,
    ESP32DataPayload,
    HealthResponse,
    HistoryResponse,
    HourlyAnalyticsItem,
    LiveStatusResponse,
    SensorReadingResponse,
)
from backend.app.services import (
    get_analytics_summary,
    get_anomalies,
    get_daily_analytics,
    get_health_status,
    get_history,
    get_hourly_analytics,
    get_live_status,
    record_reading,
)

router = APIRouter()


@router.post(
    "/data",
    response_model=SensorReadingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ESP32 Telemetry Ingestion Endpoint",
    description=(
        "Strict ESP32 contract endpoint. Accepts raw pulse counts from "
        "Sensor 1 (GPIO27, Upstream) and Sensor 2 (GPIO26, Downstream), "
        "computes flow rates, volumes, difference, ratio, determines loss/anomaly "
        "status, and stores the record in SQLite."
    ),
)
def ingest_esp32_data(payload: ESP32DataPayload):
    """Ingest sensor pulses from ESP32, calculate metrics, and persist reading."""
    reading = record_reading(
        sensor1_pulses=payload.sensor1_pulses,
        sensor2_pulses=payload.sensor2_pulses,
    )
    return reading


@router.get(
    "/api/live",
    response_model=LiveStatusResponse,
    summary="Get Live System Status",
    description="Returns the latest recorded reading, system status, and current time.",
)
def get_live():
    """Retrieve the most recent sensor reading and status."""
    return get_live_status()


@router.get(
    "/api/history",
    response_model=HistoryResponse,
    summary="Get Historical Readings",
    description="Returns paginated list of historical sensor readings, sorted by latest first.",
)
def get_reading_history(
    limit: int = Query(
        100, ge=1, le=1000, description="Max number of records to return"
    ),
    offset: int = Query(
        0, ge=0, description="Number of records to skip for pagination"
    ),
):
    """Retrieve historical sensor readings with pagination."""
    total, readings = get_history(limit=limit, offset=offset)
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "readings": readings,
    }


@router.get(
    "/api/analytics/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Water Analytics & Usage Summary",
    description="Aggregated campus water volume, average flow rates, and status distributions.",
)
def get_analytics():
    """Retrieve aggregate water analytics and status counts."""
    return get_analytics_summary()


@router.get(
    "/api/analytics/hourly",
    response_model=list[HourlyAnalyticsItem],
    summary="Hourly Water Telemetry & Analytics",
    description="Aggregates real sensor readings grouped by hour from SQLite.",
)
def get_hourly():
    """Retrieve hourly aggregated water telemetry."""
    return get_hourly_analytics()


@router.get(
    "/api/analytics/daily",
    response_model=list[DailyAnalyticsItem],
    summary="Daily Water Telemetry & Analytics",
    description="Aggregates real sensor readings grouped by day from SQLite.",
)
def get_daily():
    """Retrieve daily aggregated water telemetry."""
    return get_daily_analytics()


@router.get(
    "/api/anomalies",
    response_model=list[AnomalyRecordResponse],
    summary="Detected Water Loss & Sensor Anomalies",
    description=(
        "Retrieves detected non-NORMAL events (Possible Water Loss and Sensor/Calibration Anomalies) "
        "with rule-based diagnostic details."
    ),
)
def get_anomaly_events(
    limit: int = Query(
        100, ge=1, le=1000, description="Max number of anomaly records to return"
    ),
    offset: int = Query(
        0, ge=0, description="Number of anomaly records to skip for pagination"
    ),
    status: Optional[str] = Query(
        None,
        description="Filter by status: 'POSSIBLE WATER LOSS' or 'SENSOR/CALIBRATION ANOMALY'",
    ),
):
    """Retrieve detected water loss and anomaly incidents."""
    return get_anomalies(limit=limit, offset=offset, status_filter=status)


@router.get(
    "/api/health",
    response_model=HealthResponse,
    summary="API Healthcheck",
    description="Checks API health and database connectivity.",
)
def check_health():
    """Check health and database connection."""
    return get_health_status()
