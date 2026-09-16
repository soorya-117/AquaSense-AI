"""Pydantic schemas for request validation and API responses."""

from typing import Optional
from pydantic import BaseModel, Field


class ESP32DataPayload(BaseModel):
    """Payload received from the ESP32 hardware via POST /data."""

    sensor1_pulses: int = Field(
        ...,
        description="Raw pulse count measured by upstream flow sensor 1 (GPIO27)",
    )
    sensor2_pulses: int = Field(
        ...,
        description="Raw pulse count measured by downstream flow sensor 2 (GPIO26)",
    )


class SensorReadingResponse(BaseModel):
    """Complete sensor reading record including calculated metrics."""

    id: int
    timestamp: str
    sensor1_pulses: int
    sensor2_pulses: int
    sensor1_flow: float
    sensor2_flow: float
    sensor1_volume: float
    sensor2_volume: float
    flow_difference: float
    flow_ratio: float
    status: str


class LiveStatusResponse(BaseModel):
    """Live operating status and most recent reading."""

    status: str
    timestamp: str
    reading: Optional[SensorReadingResponse] = None
    message: Optional[str] = None


class HistoryResponse(BaseModel):
    """Historical sensor readings list with pagination details."""

    total: int
    limit: int
    offset: int
    readings: list[SensorReadingResponse]


class AnalyticsSummaryResponse(BaseModel):
    """Aggregated campus water analytics and status distribution."""

    total_readings: int
    total_pulses_sensor1: int
    total_pulses_sensor2: int
    total_volume_sensor1_liters: float
    total_volume_sensor2_liters: float
    average_flow_sensor1_lmin: float
    average_flow_sensor2_lmin: float
    flow_difference: float = 0.0
    flow_ratio: float = 1.0
    estimated_water_loss_liters: float = 0.0
    estimated_water_loss: Optional[float] = None
    cumulative_upstream_volume_liters: Optional[float] = None
    cumulative_downstream_volume_liters: Optional[float] = None
    status_counts: dict[str, int]
    latest_status: Optional[str] = None


class HourlyAnalyticsItem(BaseModel):
    """Hourly aggregated water flow and volume telemetry."""

    hour: str
    timestamp: str
    upstream_volume_liters: float
    downstream_volume_liters: float
    upstream_volume: Optional[float] = None
    downstream_volume: Optional[float] = None
    average_flow_sensor1_lmin: float
    average_flow_sensor2_lmin: float
    flow_difference: float
    flow_ratio: float
    estimated_water_loss_liters: float
    estimated_water_loss: Optional[float] = None
    reading_count: int


class DailyAnalyticsItem(BaseModel):
    """Daily aggregated water flow and volume telemetry."""

    date: str
    upstream_volume_liters: float
    downstream_volume_liters: float
    upstream_volume: Optional[float] = None
    downstream_volume: Optional[float] = None
    estimated_water_loss_liters: float
    estimated_water_loss: Optional[float] = None
    average_flow_sensor1_lmin: float
    average_upstream_flow: Optional[float] = None
    average_flow_sensor2_lmin: float
    average_downstream_flow: Optional[float] = None
    flow_difference: float
    flow_ratio: float
    reading_count: int


class AnomalyRecordResponse(BaseModel):
    """Detailed record of detected water loss or sensor anomaly."""

    id: int
    timestamp: str
    sensor1_pulses: int
    sensor2_pulses: int
    sensor1_flow: float
    sensor2_flow: float
    sensor1_volume: float
    sensor2_volume: float
    flow_difference: float
    flow_ratio: float
    status: str
    anomaly_type: str
    details: str


class HealthResponse(BaseModel):
    """System health and database connectivity report."""

    status: str
    database: str
    total_records: int
    timestamp: str
