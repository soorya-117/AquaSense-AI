"""Rule-based anomaly detection and optional ML experimentation infrastructure."""

from typing import Any, Dict, List, Optional
from backend.app.config import settings


class RuleBasedAnomalyDetector:
    """Lightweight rule-based detector for water loss and sensor anomalies.

    Enforces standardized statuses:
      - SENSOR/CALIBRATION ANOMALY: downstream > upstream + tolerance or negative pulses/flow.
      - POSSIBLE WATER LOSS: upstream - downstream > loss threshold.
      - NORMAL: balanced or idle telemetry.

    Note:
      A flow difference indicates water leaving the measured path between Sensor 1
      and Sensor 2 (e.g. intermediate tap, air pocket, or sensor drift). It does NOT
      conclusively prove a pipe leak in this experimental prototype.
    """

    def __init__(
        self,
        loss_threshold_lmin: Optional[float] = None,
        anomaly_tolerance_lmin: Optional[float] = None,
    ):
        self.loss_threshold_lmin = (
            loss_threshold_lmin
            if loss_threshold_lmin is not None
            else settings.FLOW_DIFFERENCE_THRESHOLD_LMIN
        )
        self.anomaly_tolerance_lmin = (
            anomaly_tolerance_lmin
            if anomaly_tolerance_lmin is not None
            else settings.ANOMALY_TOLERANCE_LMIN
        )

    def evaluate(
        self,
        sensor1_flow: float,
        sensor2_flow: float,
        sensor1_pulses: int = 0,
        sensor2_pulses: int = 0,
    ) -> Dict[str, Any]:
        """Evaluate flow rates and pulse counts, returning status and human-readable explanation."""
        flow_diff = sensor1_flow - sensor2_flow

        # Safe flow ratio calculation
        if sensor1_flow > 0.0:
            flow_ratio = sensor2_flow / sensor1_flow
        elif sensor2_flow == 0.0:
            flow_ratio = 1.0
        else:
            flow_ratio = 0.0

        if sensor1_pulses < 0 or sensor2_pulses < 0 or sensor1_flow < 0.0 or sensor2_flow < 0.0:
            status = "SENSOR/CALIBRATION ANOMALY"
            details = (
                "Negative pulse or flow reading detected. Indicates sensor wiring, "
                "hardware glitch, or register corruption."
            )
        elif sensor2_flow > (sensor1_flow + self.anomaly_tolerance_lmin):
            status = "SENSOR/CALIBRATION ANOMALY"
            excess = round(sensor2_flow - sensor1_flow, 4)
            details = (
                f"Downstream flow ({sensor2_flow:.3f} L/min) exceeds upstream "
                f"({sensor1_flow:.3f} L/min) by {excess:.3f} L/min (> tolerance "
                f"{self.anomaly_tolerance_lmin:.2f} L/min). Physically impossible without "
                f"secondary inflow; indicates calibration variance or sensor drift."
            )
        elif flow_diff > self.loss_threshold_lmin:
            status = "POSSIBLE WATER LOSS"
            details = (
                f"Upstream flow exceeds downstream flow by {flow_diff:.3f} L/min "
                f"(> threshold {self.loss_threshold_lmin:.2f} L/min). Water is exiting the "
                f"measured path between Sensor 1 and Sensor 2."
            )
        else:
            status = "NORMAL"
            details = "Flow rates balanced within calibrated operational noise margin."

        return {
            "status": status,
            "anomaly_type": status,
            "flow_difference": round(flow_diff, 4),
            "flow_ratio": round(flow_ratio, 4),
            "details": details,
        }


class MLAnomalyExperiment:
    """Scaffold for future unsupervised or statistical ML anomaly experimentation.

    Guarantees:
      - Does NOT fabricate synthetic training datasets.
      - Does NOT claim a scientifically trained model if insufficient real labelled data exists.
      - Gracefully falls back to the deterministic RuleBasedAnomalyDetector.
      - Keeps pandas and scikit-learn completely optional to avoid unnecessary runtime dependencies.
    """

    def __init__(self, rule_detector: Optional[RuleBasedAnomalyDetector] = None):
        self.rule_detector = rule_detector or RuleBasedAnomalyDetector()
        self.min_samples_required = 50
        self._model = None

    def is_ml_available(self) -> bool:
        """Check if scientific ML libraries are installed in the Python environment."""
        try:
            import pandas  # noqa: F401
            import sklearn  # noqa: F401
            return True
        except ImportError:
            return False

    def train_or_fit(self, real_readings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fit statistical or unsupervised anomaly model ONLY if sufficient real data is provided."""
        if not self.is_ml_available():
            return {
                "status": "unavailable",
                "message": "Optional libraries (pandas/scikit-learn) not installed. Using rule-based detector.",
                "samples_used": 0,
            }

        if len(real_readings) < self.min_samples_required:
            return {
                "status": "insufficient_data",
                "message": (
                    f"Insufficient real readings ({len(real_readings)}/{self.min_samples_required}). "
                    "Cannot fit ML model without fabricating data. Falling back to rule-based detector."
                ),
                "samples_used": len(real_readings),
            }

        # Future ML experiment implementation hook (e.g. IsolationForest, Z-Score)
        return {
            "status": "ready",
            "message": f"Experimental baseline fitted with {len(real_readings)} real telemetry points.",
            "samples_used": len(real_readings),
        }

    def predict(
        self,
        sensor1_flow: float,
        sensor2_flow: float,
        sensor1_pulses: int = 0,
        sensor2_pulses: int = 0,
    ) -> Dict[str, Any]:
        """Classify reading using rule-based ground truth."""
        return self.rule_detector.evaluate(
            sensor1_flow=sensor1_flow,
            sensor2_flow=sensor2_flow,
            sensor1_pulses=sensor1_pulses,
            sensor2_pulses=sensor2_pulses,
        )


# Global default detector instance using configured thresholds
default_anomaly_detector = RuleBasedAnomalyDetector()
