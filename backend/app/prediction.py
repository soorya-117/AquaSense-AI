"""Water demand prediction and supply allocation planning services."""

from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from backend.app.config import settings
from backend.app.database import get_db


class WaterDemandPredictor:
    """Interpretable water demand forecasting model based on real SQLite telemetry.

    Adheres to strict project rules:
      - Uses real historical sensor readings only.
      - Never fabricates synthetic readings.
      - Does not pretend to predict if real data is insufficient (< MIN_PREDICTION_SAMPLES).
      - Uses simple, explainable Linear Regression over sequential flow rates and trends.
      - Deep learning is strictly prohibited.
    """

    def __init__(self, min_samples: Optional[int] = None):
        self.min_samples = (
            min_samples
            if min_samples is not None
            else settings.MIN_PREDICTION_SAMPLES
        )

    def predict(
        self,
        db_path: Optional[str] = None,
        horizon_hours: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Generate demand prediction using real historical SQLite records."""
        horizon = (
            horizon_hours
            if horizon_hours is not None and horizon_hours > 0.0
            else settings.DEFAULT_PREDICTION_HORIZON_HOURS
        )
        current_time = datetime.now(timezone.utc).isoformat()

        # Query real historical readings
        with get_db(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, timestamp, sensor1_flow, sensor2_flow, sensor1_volume
                FROM sensor_readings
                ORDER BY id ASC;
                """
            )
            rows = cursor.fetchall()

        # Filter for valid non-negative readings
        valid_readings = [
            dict(r) for r in rows
            if r["sensor1_flow"] is not None and r["sensor1_flow"] >= 0.0
        ]
        n_samples = len(valid_readings)

        # Insufficient data check: Never fabricate fake data
        if n_samples < self.min_samples:
            return {
                "status": "insufficient_data",
                "is_available": False,
                "predicted_demand_liters": None,
                "predicted_flow_lmin": None,
                "model_name": None,
                "observations_used": n_samples,
                "confidence_score": None,
                "prediction_horizon_hours": round(horizon, 2),
                "message": "Insufficient historical data for prediction.",
                "timestamp": current_time,
            }

        # Construct features from real telemetry
        # Target: sensor1_flow (upstream demand rate in L/min)
        y = [float(r["sensor1_flow"]) for r in valid_readings]

        # Feature matrix:
        # 1. Sequential time step (0, 1, ..., N-1)
        # 2. Lag-1 flow rate
        # 3. 3-step moving average
        X: List[List[float]] = []
        for i in range(n_samples):
            t_step = float(i)
            lag1 = y[i - 1] if i > 0 else y[0]
            window_slice = y[max(0, i - 2) : i + 1]
            rolling_avg = sum(window_slice) / len(window_slice)
            X.append([t_step, lag1, rolling_avg])

        # Train interpretable Linear Regression
        try:
            from sklearn.linear_model import LinearRegression
            import numpy as np

            model = LinearRegression()
            X_arr = np.array(X)
            y_arr = np.array(y)
            model.fit(X_arr, y_arr)

            # Next step feature vector
            next_t = float(n_samples)
            next_lag1 = y[-1]
            next_rolling = sum(y[-3:]) / min(3, len(y))
            X_next = np.array([[next_t, next_lag1, next_rolling]])

            pred_flow_raw = float(model.predict(X_next)[0])
            r2_score = float(model.score(X_arr, y_arr))
            if math.isnan(r2_score) or math.isinf(r2_score):
                confidence = 50.0
            else:
                confidence = round(max(0.0, min(100.0, r2_score * 100.0)), 1)
            model_name = "Linear Regression (Sequence & Trend Analysis)"

        except Exception:
            # Deterministic fallback linear trend calculation
            # y = a * t + b
            mean_x = (n_samples - 1) / 2.0
            mean_y = sum(y) / n_samples
            denom = sum((i - mean_x) ** 2 for i in range(n_samples))
            if denom > 0:
                slope = sum((i - mean_x) * (y[i] - mean_y) for i in range(n_samples)) / denom
                intercept = mean_y - slope * mean_x
                pred_flow_raw = slope * n_samples + intercept
            else:
                pred_flow_raw = mean_y

            confidence = 50.0
            model_name = "Deterministic Linear Trend Model"

        # Guard: predicted flow cannot be negative, NaN, or infinite
        if math.isnan(pred_flow_raw) or math.isinf(pred_flow_raw):
            pred_flow_raw = float(y[-1]) if y else 0.0
        predicted_flow = round(max(0.0, pred_flow_raw), 4)

        # Volumetric demand (Liters) = flow (L/min) * 60 min/hr * horizon (hr)
        predicted_demand = round(predicted_flow * 60.0 * horizon, 4)

        return {
            "status": "available",
            "is_available": True,
            "predicted_demand_liters": predicted_demand,
            "predicted_flow_lmin": predicted_flow,
            "model_name": model_name,
            "observations_used": n_samples,
            "confidence_score": confidence,
            "prediction_horizon_hours": round(horizon, 2),
            "message": "Demand prediction generated successfully using historical telemetry.",
            "timestamp": current_time,
        }


class WaterSupplyPlanner:
    """Evaluates water supply adequacy against predicted water demand."""

    def __init__(self, predictor: Optional[WaterDemandPredictor] = None):
        self.predictor = predictor or WaterDemandPredictor()
        self._cached_plan: Optional[Dict[str, Any]] = None

    def evaluate_supply(
        self,
        available_water_liters: float,
        horizon_hours: Optional[float] = None,
        db_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Evaluate water supply against real demand forecast."""
        horizon = (
            horizon_hours
            if horizon_hours is not None and horizon_hours > 0.0
            else settings.DEFAULT_PREDICTION_HORIZON_HOURS
        )
        current_time = datetime.now(timezone.utc).isoformat()

        # Retrieve prediction
        prediction = self.predictor.predict(
            db_path=db_path, horizon_hours=horizon
        )

        if not prediction["is_available"]:
            plan = {
                "status": "INSUFFICIENT_DATA",
                "planning_status": None,
                "available_water_liters": round(available_water_liters, 4),
                "predicted_demand_liters": None,
                "surplus_liters": None,
                "prediction_available": False,
                "planning_horizon_hours": round(horizon, 2),
                "message": "Planning cannot be completed until sufficient real historical data exists for demand prediction.",
                "timestamp": current_time,
            }
            self._cached_plan = plan
            return plan

        predicted_demand = prediction["predicted_demand_liters"]
        surplus = round(available_water_liters - predicted_demand, 4)

        # Status determination: SUFFICIENT or POTENTIAL SHORTAGE
        if available_water_liters >= predicted_demand:
            status = "SUFFICIENT"
            message = (
                f"Water supply ({available_water_liters:.2f} L) is currently SUFFICIENT "
                f"for the projected {horizon:.1f}-hour demand ({predicted_demand:.2f} L). "
                f"Projected surplus: {surplus:.2f} L."
            )
        else:
            status = "POTENTIAL SHORTAGE"
            deficit = abs(surplus)
            message = (
                f"Water supply ({available_water_liters:.2f} L) indicates a POTENTIAL SHORTAGE "
                f"against projected {horizon:.1f}-hour demand ({predicted_demand:.2f} L). "
                f"Estimated deficit: {deficit:.2f} L."
            )

        plan = {
            "status": status,
            "planning_status": status,
            "available_water_liters": round(available_water_liters, 4),
            "predicted_demand_liters": predicted_demand,
            "surplus_liters": surplus,
            "prediction_available": True,
            "planning_horizon_hours": round(horizon, 2),
            "message": message,
            "timestamp": current_time,
        }
        self._cached_plan = plan
        return plan

    def reset(self) -> None:
        """Reset cached plan for clean test isolation."""
        self._cached_plan = None

    def get_latest_plan(
        self, db_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Retrieve the latest evaluated supply plan or compute default state."""
        if self._cached_plan is not None:
            return self._cached_plan

        # If no plan submitted yet, attempt evaluation with 0.0 available
        return self.evaluate_supply(
            available_water_liters=0.0,
            db_path=db_path,
        )


# Global singletons
default_demand_predictor = WaterDemandPredictor()
default_supply_planner = WaterSupplyPlanner(default_demand_predictor)
