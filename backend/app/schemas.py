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
    estimated_water_loss_liters: float
    status_counts: dict[str, int]
    latest_status: Optional[str] = None


class HealthResponse(BaseModel):
    """System health and database connectivity report."""

    status: str
    database: str
    total_records: int
    timestamp: str
