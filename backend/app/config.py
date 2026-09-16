"""Configuration and calibration settings for AquaSense AI backend."""

import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseModel):
    """Application settings and sensor calibration parameters."""

    # Calibration parameters for YF-S401 Flow Sensors
    # Experimental YF-S401 nominal pulse rate: ~5880 pulses per Liter (98 pulses/sec per 1 L/min)
    PULSES_PER_LITER_S1: float = float(
        os.getenv("AQUASENSE_CALIBRATION_S1", "5880.0")
    )
    PULSES_PER_LITER_S2: float = float(
        os.getenv("AQUASENSE_CALIBRATION_S2", "5880.0")
    )

    # Sample reporting interval in seconds (default: 1.0 second per ESP32 report)
    SAMPLE_INTERVAL_SECONDS: float = float(
        os.getenv("AQUASENSE_SAMPLE_INTERVAL", "1.0")
    )

    # Threshold for status: 'POSSIBLE WATER LOSS' (sensor1_flow - sensor2_flow > threshold)
    FLOW_DIFFERENCE_THRESHOLD_LMIN: float = float(
        os.getenv("AQUASENSE_LOSS_THRESHOLD_LMIN", "0.15")
    )

    # Tolerance for status: 'SENSOR/CALIBRATION ANOMALY' when downstream exceeds upstream
    ANOMALY_TOLERANCE_LMIN: float = float(
        os.getenv("AQUASENSE_ANOMALY_TOLERANCE_LMIN", "0.10")
    )

    # Database file path
    DB_PATH: str = os.getenv(
        "AQUASENSE_DB_PATH", str(BASE_DIR / "aquasense.db")
    )

    # Allowed CORS Origins for React Frontend (configurable via AQUASENSE_CORS_ORIGINS)
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "AQUASENSE_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]

    # Water demand prediction parameters
    MIN_PREDICTION_SAMPLES: int = int(
        os.getenv("AQUASENSE_MIN_PREDICTION_SAMPLES", "10")
    )
    DEFAULT_PREDICTION_HORIZON_HOURS: float = float(
        os.getenv("AQUASENSE_PREDICTION_HORIZON_HOURS", "1.0")
    )


settings = Settings()
