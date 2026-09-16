"""API route handlers for AquaSense AI."""

from typing import Optional
from fastapi import APIRouter, Query, status
from backend.app.prediction import (
    default_demand_predictor,
    default_supply_planner,
)
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
    SupplyPlanRequest,
    SupplyPlanResponse,
    WaterDemandPredictionResponse,
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
    "/api/prediction",
    response_model=WaterDemandPredictionResponse,
    summary="Water Demand Prediction",
    description=(
        "Forecasts upcoming water demand rate (L/min) and volumetric demand (Liters) "
        "from real historical SQLite telemetry using interpretable Linear Regression. "
        "Returns 'insufficient_data' if fewer than the minimum required samples exist."
    ),
)
def get_prediction(
    horizon_hours: Optional[float] = Query(
        None,
        gt=0.0,
        le=72.0,
        description="Forecast horizon in hours (defaults to 1.0 hr)",
    ),
):
    """Retrieve water demand prediction based on real telemetry."""
    return default_demand_predictor.predict(horizon_hours=horizon_hours)


@router.post(
    "/api/supply",
    response_model=SupplyPlanResponse,
    summary="Evaluate Water Supply Allocation Plan",
    description=(
        "Evaluates water supply adequacy (SUFFICIENT vs POTENTIAL SHORTAGE) "
        "by comparing available water against forecasted demand."
    ),
)
def create_supply_plan(payload: SupplyPlanRequest):
    """Evaluate supply adequacy against real demand forecast."""
    return default_supply_planner.evaluate_supply(
        available_water_liters=payload.available_water_liters,
        horizon_hours=payload.planning_horizon_hours,
    )


@router.get(
    "/api/supply",
    response_model=SupplyPlanResponse,
    summary="Get Current Water Supply Allocation Plan",
    description="Retrieves the current or latest evaluated water supply allocation status.",
)
def get_current_supply_plan():
    """Retrieve the current water supply allocation plan."""
    return default_supply_planner.get_latest_plan()


@router.get(
    "/api/health",
    response_model=HealthResponse,
    summary="API Healthcheck",
    description="Checks API health and database connectivity.",
)
def check_health():
    """Check health and database connection."""
    return get_health_status()
