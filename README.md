# AquaSense AI – Intelligent Campus Water Management System

An intelligent, full-stack campus water management and telemetry monitoring system. **AquaSense AI** ingests live flow telemetry from an ESP32 microcontroller instrumented with dual YF-S401 Hall-effect flow sensors, computes flow rates and cumulative volumetric differentials, diagnoses potential pipe losses and sensor anomalies, delivers interpretable machine learning demand predictions, and evaluates reservoir supply adequacy through an interactive React dashboard.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [System Architecture](#4-system-architecture)
5. [Complete Data Flow](#5-complete-data-flow)
6. [Hardware Components & Sensor Arrangement](#6-hardware-components--sensor-arrangement)
7. [ESP32 to FastAPI Communication](#7-esp32-to-fastapi-communication)
8. [SQLite Database Architecture](#8-sqlite-database-architecture)
9. [Water Analytics Engine](#9-water-analytics-engine)
10. [Anomaly Detection & Classification](#10-anomaly-detection--classification)
11. [Water Demand Prediction (ML)](#11-water-demand-prediction-ml)
12. [Water Supply & Allocation Planning](#12-water-supply--allocation-planning)
13. [React Frontend Dashboard](#13-react-frontend-dashboard)
14. [Complete API Endpoint Table](#14-complete-api-endpoint-table)
15. [Status Definitions](#15-status-definitions)
16. [Configuration & Environment Variables](#16-configuration--environment-variables)
17. [Sensor Calibration Guide](#17-sensor-calibration-guide)
18. [Machine Learning Methodology & Guardrails](#18-machine-learning-methodology--guardrails)
19. [Minimum Historical Data Requirement & No-Fake-Data Policy](#19-minimum-historical-data-requirement--no-fake-data-policy)
20. [Important Technical Limitations](#20-important-technical-limitations)
21. [Prototype & Research Disclaimer](#21-prototype--research-disclaimer)
22. [Installation & Setup](#22-installation--setup)
23. [Running Automated Tests](#23-running-automated-tests)
24. [Step-by-Step Demo Procedure](#24-step-by-step-demo-procedure)
25. [Future Improvements](#25-future-improvements)

---

## 1. Project Overview

Educational institutions, residential campuses, and municipal facilities often suffer from unaccounted water loss, undetected pipe anomalies, manual supply estimation, and lack of real-time visibility into usage patterns. 

**AquaSense AI** solves these challenges by combining:
- **Low-cost IoT edge instrumentation** (ESP32 with dual flow sensors in series).
- **A high-performance FastAPI backend monolith** with local SQLite storage.
- **Rule-based anomaly and water loss diagnostics** with safe zero-division mathematics.
- **Explainable Linear Regression demand forecasting** based exclusively on real historical telemetry.
- **Water supply allocation planning** comparing real-time reservoir levels against demand.
- **A modern React + TypeScript + Tailwind CSS dashboard** with live charts, status badges, and empty/waiting states.

---

## 2. Problem Statement

Water distribution networks on university campuses frequently operate as opaque systems. Traditional bulk water meters are checked manually once a month, leading to:
1. **Undetected Losses:** Pinholes, ruptured joints, or dripping intermediate outlets waste thousands of liters before discovery.
2. **Sensor & Line Misdiagnoses:** Existing systems often mistake sensor drift or aeration for physical pipe ruptures.
3. **Supply Disconnect:** Reservoir management relies on intuition rather than empirical consumption velocity and trend forecasts.
4. **Data Fabrication in Prototypes:** Many academic prototypes inject simulated random telemetry, obscuring real-world calibration challenges and physical edge conditions.

---

## 3. Proposed Solution

AquaSense AI introduces a closed-loop monitoring pipeline:
- **Dual-Sensor Differential Pipeline:** Upstream (Sensor 1) and downstream (Sensor 2) flow meters bound a monitored pipe segment.
- **Strict Edge-to-Cloud Contract:** The ESP32 transmits raw pulse counts via a standardized `POST /data` JSON payload.
- **Deterministic Server-Side Physics:** Flow rates (L/min) and incremental volumes (L) are computed server-side from configurable calibration factors.
- **Calibrated Operational Classifications:** Standardized statuses (`NORMAL`, `POSSIBLE WATER LOSS`, `SENSOR/CALIBRATION ANOMALY`) distinguish physical departure of water from calibration errors.
- **Ground-Truth Machine Learning:** Demand predictions are produced using interpretable Linear Regression on real telemetry sequences without synthesizing fake training sets.

---

## 4. System Architecture

```
[Physical Pipeline]
  Water Pump
      ↓
  Sensor 1 (Upstream: YF-S401 @ GPIO27)
      ↓
  Monitored Pipe Segment / Intermediate Draw-off
      ↓
  Sensor 2 (Downstream: YF-S401 @ GPIO26)
      ↓
  Outlet 2

[Edge Layer]
  ESP32 Microcontroller (Accumulates pulse interrupts over 1.0s)
      ↓ HTTP POST /data (Wi-Fi 802.11 b/g/n)
[Backend Layer]
  FastAPI Server (Port 8000)
      ├── Services & Metric Calculations
      ├── RuleBasedAnomalyDetector
      ├── WaterDemandPredictor (Linear Regression)
      ├── WaterSupplyPlanner
      └── SQLite Database (aquasense.db)
[Frontend Layer]
  React 18 + Vite Dashboard (Port 5173)
      ├── Live Telemetry Polling (3.5s interval)
      ├── Recharts Visualizations
      └── 6 Modular Pages (Dashboard, Usage, Anomalies, Prediction, Planning, System)
```

---

## 5. Complete Data Flow

1. **Pulse Detection:** Water pumped through the line spins turbine rotors inside the two YF-S401 Hall-effect sensors. Interrupt routines on the ESP32 count rising pulse edges.
2. **Batch Reporting:** Every sample interval (default: 1.0 second), the ESP32 issues an HTTP `POST /data` request containing `{"sensor1_pulses": <int>, "sensor2_pulses": <int>}`.
3. **Metric Calculation:**
   - Incremental Volume: $V = \frac{\text{pulses}}{\text{pulses\_per\_liter}}$ (Liters)
   - Flow Rate: $Q = \left(\frac{V}{\Delta t}\right) \times 60.0$ (L/min)
   - Flow Difference: $\Delta Q = Q_1 - Q_2$
   - Flow Ratio: $R = \frac{Q_2}{Q_1}$ (safely guarded against $Q_1 = 0$)
4. **Status Determination:** The engine classifies the reading into `NORMAL`, `POSSIBLE WATER LOSS`, or `SENSOR/CALIBRATION ANOMALY`.
5. **Database Persistence:** The record is committed to SQLite (`sensor_readings` table).
6. **Analytics & Aggregation:** Time-windowed aggregations (hourly and daily) are computed via SQL `strftime` grouping.
7. **Demand Forecasting:** When at least 10 valid historical records exist, sequential lag and rolling average features are fitted to an interpretable Linear Regression model to forecast demand rate and volume.
8. **Dashboard Presentation:** The React client polls `GET /api/live` and renders live charts, KPI cards, and diagnostics.

---

## 6. Hardware Components & Sensor Arrangement

The physical prototype uses strictly defined, low-cost hardware:

| Component | Specification | Connection / Role |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32 Development Board | Wi-Fi client, 3.3V logic, dual hardware interrupt pins |
| **Sensor 1 (Upstream)** | YF-S401 Hall-Effect Flow Meter | Signal pin connected to **GPIO27** with internal pull-up |
| **Sensor 2 (Downstream)** | YF-S401 Hall-Effect Flow Meter | Signal pin connected to **GPIO26** with internal pull-up |
| **Actuator / Source** | 12V / 5V Submersible Water Pump | Manual switching to drive water through pipeline |
| **Plumbing Layout** | Flexible food-grade tubing / PVC | Segment between Sensor 1 and Sensor 2 allows controlled loss |

### Sensor Positioning
- **Sensor 1 (GPIO27)** is placed directly downstream of the pump outlet to measure total water injected into the system.
- **Sensor 2 (GPIO26)** is positioned at the terminal end of the line segment.
- A controlled valve or T-junction between Sensor 1 and Sensor 2 represents an intermediate withdrawal point or loss location.

---

## 7. ESP32 to FastAPI Communication

The ESP32 communicates over standard Wi-Fi via HTTP REST.

### Ingestion Contract (Strict & Backward-Compatible)
- **Endpoint:** `POST /data`
- **Port:** `8000`
- **Content-Type:** `application/json`
- **Payload Schema:**
```json
{
  "sensor1_pulses": 100,
  "sensor2_pulses": 80
}
```
- **Response Code:** `201 Created`
- **Response Schema:** Complete `SensorReadingResponse` including calculated flows, volumes, flow difference, ratio, and operating status.

---

## 8. SQLite Database Architecture

The system uses a clean, zero-configuration, file-based SQLite database (`aquasense.db`).

### Schema: `sensor_readings`
```sql
CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    sensor1_pulses INTEGER NOT NULL,
    sensor2_pulses INTEGER NOT NULL,
    sensor1_flow REAL NOT NULL,
    sensor2_flow REAL NOT NULL,
    sensor1_volume REAL NOT NULL,
    sensor2_volume REAL NOT NULL,
    flow_difference REAL NOT NULL,
    flow_ratio REAL NOT NULL,
    status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp
ON sensor_readings(timestamp);
```

- **Row Factory:** Enabled for dictionary-like mapping in Python services.
- **Transactions:** Handled via context manager (`get_db()`) ensuring atomic commits and automatic rollbacks on exceptions.
- **Zero Test Contamination:** Unit and integration tests run against isolated temporary databases, keeping the production `aquasense.db` pristine.

---

## 9. Water Analytics Engine

The backend provides three analytical aggregation levels:

1. **Summary Analytics (`GET /api/analytics/summary`):**
   - Total recorded telemetry observations.
   - Cumulative upstream volume ($V_1$) and downstream volume ($V_2$) in Liters.
   - Overall average flow rates ($Q_1, Q_2$) in L/min.
   - Estimated water loss: $\max(0.0, V_1 - V_2)$.
   - Status distribution breakdown (`NORMAL`, `POSSIBLE WATER LOSS`, `SENSOR/CALIBRATION ANOMALY`).
2. **Hourly Analytics (`GET /api/analytics/hourly`):**
   - Grouped by ISO 8601 hour slots (`YYYY-MM-DDTHH:00:00`).
   - Computes total volume per hour, average flow, and hourly loss gaps.
3. **Daily Analytics (`GET /api/analytics/daily`):**
   - Grouped by calendar day (`YYYY-MM-DD`).
   - Delivers day-over-day consumption trends for long-term auditing.

---

## 10. Anomaly Detection & Classification

The `RuleBasedAnomalyDetector` classifies operational states based on physical and hydraulic rules:

```
                  ┌───────────────────────────────┐
                  │ Raw Telemetry Pulses Ingested │
                  └───────────────┬───────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
[Pulses < 0 or Flow < 0?]                        [Q2 > Q1 + Anomaly Tolerance?]
  ├── Yes ──► SENSOR/CALIBRATION ANOMALY           ├── Yes ──► SENSOR/CALIBRATION ANOMALY
  └── No                                          └── No
          │                                               │
          └───────────────────────┬───────────────────────┘
                                  │
                                  ▼
                    [Q1 - Q2 > Loss Threshold?]
                      ├── Yes ──► POSSIBLE WATER LOSS
                      └── No  ──► NORMAL
```

### Classification Criteria:
- **`NORMAL`:** Telemetry is balanced ($Q_1 - Q_2 \le 0.15\text{ L/min}$) or both sensors are idle ($0\text{ L/min}$).
- **`POSSIBLE WATER LOSS`:** Upstream flow exceeds downstream flow beyond the loss threshold ($Q_1 - Q_2 > 0.15\text{ L/min}$).
- **`SENSOR/CALIBRATION ANOMALY`:** Downstream flow physically exceeds upstream flow beyond tolerance ($Q_2 > Q_1 + 0.10\text{ L/min}$), or invalid negative pulse counts are detected.

---

## 11. Water Demand Prediction (ML)

The `WaterDemandPredictor` delivers short-to-medium-term volumetric demand forecasts using an explainable, classical machine learning approach:

- **Target Variable:** Upstream consumption flow rate $Q_1$ (L/min).
- **Feature Engineering:**
  1. Sequential time step index $t \in [0, N-1]$.
  2. Lag-1 flow observation $Q_{1}(t-1)$.
  3. 3-step moving average $\frac{1}{3}\sum_{k=0}^{2} Q_1(t-k)$.
- **Model:** `LinearRegression` from `scikit-learn` (with deterministic linear trend fallback).
- **Confidence Metric:** $R^2$ coefficient of determination scaled to $0.0\% - 100.0\%$.
- **Volumetric Extrapolation:** 
  $$\text{Predicted Demand (Liters)} = \text{Predicted Flow (L/min)} \times 60 \times \text{Horizon (Hours)}$$
- **Numeric Safeguards:** Flow predictions and confidence scores are guarded against negative values, `NaN`, and `Inf`.

---

## 12. Water Supply & Allocation Planning

The `WaterSupplyPlanner` evaluates reservoir adequacy against projected campus demand:

- **Inputs:**
  - `available_water_liters`: Measured or reported tank capacity in Liters.
  - `planning_horizon_hours`: Forecasting interval (default 1.0 hr, up to 72 hrs).
- **Evaluation Formula:**
  $$\text{Surplus (Liters)} = \text{Available Water} - \text{Predicted Demand}$$
- **Planning Statuses:**
  - **`SUFFICIENT`:** $\text{Available Water} \ge \text{Predicted Demand}$ ($\text{Surplus} \ge 0$).
  - **`POTENTIAL SHORTAGE`:** $\text{Available Water} < \text{Predicted Demand}$ ($\text{Deficit} = |\text{Surplus}|$).
  - **`INSUFFICIENT_DATA`:** Fewer than 10 historical readings exist; demand cannot be responsibly evaluated without fabricating data.

---

## 13. React Frontend Dashboard

Built with React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons, and Recharts.

### Key Pages:
1. **Dashboard (`/`):** Real-time comparative flow chart, KPI cards (Upstream Flow, Downstream Flow, Signed Flow Difference, Flow Ratio), operational status badge, hardware pin mappings, and dynamic warning banners for loss and sensor anomalies.
2. **Water Usage (`/water-usage`):** Cumulative volumes, estimated water loss, area trend chart, and a paginated historical telemetry log.
3. **Anomaly Detection (`/anomaly-detection`):** Rule criteria breakdown, distribution counts, engineering disclaimer, and flagged incident table.
4. **Prediction (`/prediction`):** Machine learning demand forecast, active model diagnostics, interactive horizon selector (0.5h, 1.0h, 2.0h, 6.0h), and clear waiting state checklist.
5. **Water Planning (`/water-planning`):** Supply evaluation form, surplus/deficit gauge, horizon input, and planning status badge.
6. **System (`/system`):** FastAPI connectivity, round-trip API latency counter, SQLite row counts, and hardware pin map.

---

## 14. Complete API Endpoint Table

| Method | Path | Summary | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/data` | ESP32 Telemetry Ingestion | Accepts raw pulses from Sensor 1 (GPIO27) and Sensor 2 (GPIO26), computes metrics, assigns status, and commits to SQLite. |
| `GET` | `/api/live` | Live Status | Returns the latest recorded reading, system status, timestamp, and human-readable state message. |
| `GET` | `/api/history` | Historical Readings | Returns paginated historical sensor readings sorted descending by ID (`limit`, `offset`). |
| `GET` | `/api/analytics/summary` | Analytics Summary | Returns total readings, cumulative volumes, average flow rates, and status distributions. |
| `GET` | `/api/analytics/hourly` | Hourly Telemetry | Aggregates readings grouped by hour (`YYYY-MM-DDTHH:00:00`) for trend visualization. |
| `GET` | `/api/analytics/daily` | Daily Telemetry | Aggregates readings grouped by date (`YYYY-MM-DD`) for day-over-day consumption auditing. |
| `GET` | `/api/anomalies` | Detected Anomalies | Lists non-NORMAL incidents (`POSSIBLE WATER LOSS`, `SENSOR/CALIBRATION ANOMALY`) with diagnostic explanations. |
| `GET` | `/api/prediction` | Demand Forecasting | Generates demand predictions (L/min and Liters) using Linear Regression over historical telemetry (`horizon_hours`). |
| `POST` | `/api/supply` | Evaluate Supply Plan | Evaluates reservoir adequacy against predicted demand (`available_water_liters`, `planning_horizon_hours`). |
| `GET` | `/api/supply` | Current Supply Plan | Retrieves the current or latest evaluated water supply allocation status. |
| `GET` | `/api/health` | System Healthcheck | Checks API responsiveness, database connectivity status, and total recorded rows. |
| `GET` | `/` | API Root Overview | Returns backend metadata, status, and direct links to documentation. |
| `GET` | `/docs` | Interactive Swagger UI | Interactive OpenAPI documentation and test console. |

---

## 15. Status Definitions

The system maintains strict status vocabularies:

### Telemetry & Flow Statuses:
- **`NORMAL`:** System is balanced or flow differential is within normal noise tolerance ($\le 0.15$ L/min).
- **`POSSIBLE WATER LOSS`:** Upstream flow exceeds downstream flow by more than $0.15$ L/min.
- **`SENSOR/CALIBRATION ANOMALY`:** Downstream flow exceeds upstream by more than $0.10$ L/min, or negative pulse counts are reported.
- **`IDLE`:** Database contains no records yet or the system is awaiting initial ESP32 telemetry.

### Supply Planning Statuses:
- **`SUFFICIENT`:** Available reservoir volume is greater than or equal to projected demand.
- **`POTENTIAL SHORTAGE`:** Available reservoir volume is less than projected demand.
- **`INSUFFICIENT_DATA`:** Fewer than 10 historical records exist in SQLite; prediction is unavailable.

---

## 16. Configuration & Environment Variables

All parameters are configurable via environment variables or a `.env` file in the project root:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `AQUASENSE_CALIBRATION_S1` | `float` | `5880.0` | Calibration factor for Sensor 1 (pulses per Liter for YF-S401). |
| `AQUASENSE_CALIBRATION_S2` | `float` | `5880.0` | Calibration factor for Sensor 2 (pulses per Liter for YF-S401). |
| `AQUASENSE_SAMPLE_INTERVAL` | `float` | `1.0` | ESP32 reporting interval in seconds. |
| `AQUASENSE_LOSS_THRESHOLD_LMIN` | `float` | `0.15` | Minimum flow differential ($Q_1 - Q_2$) triggering `POSSIBLE WATER LOSS`. |
| `AQUASENSE_ANOMALY_TOLERANCE_LMIN` | `float` | `0.10` | Tolerance above which downstream $Q_2 > Q_1$ triggers `SENSOR/CALIBRATION ANOMALY`. |
| `AQUASENSE_DB_PATH` | `str` | `aquasense.db` | Absolute or relative path to the SQLite database file. |
| `AQUASENSE_CORS_ORIGINS` | `str` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins. |
| `AQUASENSE_MIN_PREDICTION_SAMPLES` | `int` | `10` | Minimum historical records required before ML forecasting activates. |
| `AQUASENSE_PREDICTION_HORIZON_HOURS` | `float` | `1.0` | Default forecasting horizon window in hours. |

---

## 17. Sensor Calibration Guide

The default calibration factor (`5880.0` pulses/Liter) is based on nominal manufacturer specifications for the YF-S401 flow sensor ($f = 98 \times Q$ pulses/sec per 1 L/min $\rightarrow 98 \times 60 = 5880$ pulses/Liter).

> [!IMPORTANT]
> The default calibration factor is an experimental baseline and has **not** been scientifically validated for high-precision metrology. Flow dynamics, pipe diameter, water pressure, and water temperature cause physical variances.

### Physical Calibration Procedure:
1. Prepare a graduated measuring cylinder or container with exact volume markings (e.g., 5.0 Liters).
2. Connect the pipeline, turn on the pump, and collect water until exactly 5.0 Liters is reached.
3. Record total pulses reported by Sensor 1 and Sensor 2 via `/api/history` or serial console.
4. Calculate the adjusted calibration factor:
   $$\text{PULSES\_PER\_LITER} = \frac{\text{Total Pulses Accumulated}}{\text{Measured Volume in Liters (5.0)}}$$
5. Set `AQUASENSE_CALIBRATION_S1` and `AQUASENSE_CALIBRATION_S2` in your environment or `.env` file.

---

## 18. Machine Learning Methodology & Guardrails

- **Interpretable Classical Modeling:** The model uses standard Linear Regression fitted over sequential telemetry features ($t$, lag-1 flow, 3-step rolling average).
- **Strict Prohibition on Deep Learning:** Deep learning (PyTorch, TensorFlow, LSTM) is prohibited in this project to prevent unnecessary complexity and high memory overhead on lightweight deployment hosts.
- **Statistical Evaluation:** The $R^2$ score represents the proportion of flow variance explained by sequence and trend features.
- **Experimental Notice:** The ML model is designed for educational exploration of predictive water demand. Accuracy has not been certified for mission-critical municipal infrastructure.

---

## 19. Minimum Historical Data Requirement & No-Fake-Data Policy

- **Minimum Samples Guard:** The backend requires at least **10 real historical observations** before calculating a demand prediction.
- **Clean Fallback:** If fewer than 10 samples exist, `GET /api/prediction` returns:
  ```json
  {
    "status": "insufficient_data",
    "is_available": false,
    "observations_used": 0,
    "message": "Insufficient historical data for prediction."
  }
  ```
- **Zero Data Fabrication:** The backend will **never** generate fake telemetry in production databases to make charts or forecasts appear populated. When the database is empty, the UI clearly displays `"Waiting for sensor data"`.

---

## 20. Important Technical Limitations

1. **Flow Differential $\neq$ Guaranteed Pipe Leak:** A difference between upstream and downstream flow indicates water leaving the measured line segment between Sensor 1 and Sensor 2. Potential causes include:
   - Intermediate consumer outlets or intentional taps.
   - Entrapped air pockets and aeration bubbles.
   - Sensor calibration mismatch or drift over time.
   - Hydraulic turbulence at pipe elbows.
   For this reason, the status is strictly termed **`POSSIBLE WATER LOSS`**.
2. **Turbine Flow Range:** The YF-S401 has a minimum operating threshold (~0.3 L/min). Flow below this rate will not spin the impeller and registers as 0 pulses.
3. **Wi-Fi Connectivity:** If the ESP32 loses Wi-Fi connection, pulses accumulated during the disconnect are either buffered on the edge or lost depending on firmware buffer implementation.

---

## 21. Prototype & Research Disclaimer

**AquaSense AI is an experimental academic prototype and research project.** It is designed for educational demonstrations, campus sustainability studies, and IoT architecture validation. It is **not** certified for commercial safety, billing-grade sub-metering, or life-critical leak-detection applications.

---

## 22. Installation & Setup

### Prerequisites
- **Python 3.10+** (tested on Python 3.11)
- **Node.js 18+** and **npm**
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/soorya-117/AquaSense-AI.git
cd AquaSense-AI
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

## 23. Running the Project

### Start Backend Server
```bash
# Ensure virtual environment is active
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will start at [http://localhost:8000](http://localhost:8000). Interactive Swagger documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Start Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
The React dashboard will be accessible at [http://localhost:5173](http://localhost:5173).

---

## 24. Running Automated Tests

### Backend Pytest Suite
```bash
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```
The test suite executes 40 automated tests covering all endpoints, mathematical formulas, edge cases, error conditions, and prediction guards against an isolated temporary database.

### Frontend Production Build Test
```bash
cd frontend
npm run build
cd ..
```
Executes TypeScript type-checking (`tsc`) and Vite production bundle generation.

---

## 25. Step-by-Step Demo Procedure

To verify all system features during a demonstration without physical hardware connected, you can simulate ESP32 telemetry using `curl` or PowerShell:

### Step 1: Verify Initial Clean / Empty State
1. Open the dashboard at [http://localhost:5173](http://localhost:5173).
2. Note that KPI cards display `--`, the chart shows `"Waiting for sensor data"`, and Prediction indicates `"Insufficient historical data for prediction."`

### Step 2: Ingest Balanced Flow (NORMAL)
Send a balanced reading:
```bash
curl -X POST http://localhost:8000/data \
  -H "Content-Type: application/json" \
  -d "{\"sensor1_pulses\": 100, \"sensor2_pulses\": 100}"
```
- **Dashboard:** Status updates to `NORMAL`, flow difference shows `0.00 L/min`, ratio shows `100.0%`.

### Step 3: Ingest Water Loss Event (POSSIBLE WATER LOSS)
Send a reading where upstream exceeds downstream beyond the 0.15 L/min threshold:
```bash
curl -X POST http://localhost:8000/data \
  -H "Content-Type: application/json" \
  -d "{\"sensor1_pulses\": 120, \"sensor2_pulses\": 80}"
```
- **Dashboard:** An amber warning banner appears: `"Notice: Possible Water Loss Detected"`. Status changes to `POSSIBLE WATER LOSS`.

### Step 4: Ingest Calibration Anomaly (SENSOR/CALIBRATION ANOMALY)
Send a reading where downstream exceeds upstream beyond tolerance:
```bash
curl -X POST http://localhost:8000/data \
  -H "Content-Type: application/json" \
  -d "{\"sensor1_pulses\": 40, \"sensor2_pulses\": 90}"
```
- **Dashboard:** A rose warning banner appears: `"Notice: Sensor / Calibration Anomaly Detected"`. Status changes to `SENSOR/CALIBRATION ANOMALY`.

### Step 5: Unlock Machine Learning Demand Prediction
Send 7 additional readings to reach the minimum threshold of 10 observations:
```bash
for ($i=1; $i -le 7; $i++) {
  curl -X POST http://localhost:8000/data -H "Content-Type: application/json" -d "{\"sensor1_pulses\": 100, \"sensor2_pulses\": 98}"
}
```
1. Navigate to the **Prediction** page.
2. The model automatically transitions from standby to **Active**.
3. View the forecasted flow rate, projected volumetric demand, and confidence score.
4. Click different horizon buttons (`0.5h`, `1.0h`, `2.0h`, `6.0h`) to observe demand scaling.

### Step 6: Evaluate Water Supply Planning
1. Navigate to the **Water Planning** page.
2. Enter `500` Liters available and click **Evaluate Water Allocation**.
3. If reservoir volume exceeds demand, the status displays **`SUFFICIENT`** with projected surplus.
4. Enter `1` Liter available to observe the **`POTENTIAL SHORTAGE`** alert with deficit gap.

---

## 26. Future Improvements

1. **Multi-Node LoRaWAN Architecture:** Expand beyond Wi-Fi to low-power long-range LoRaWAN telemetry nodes for campus-wide coverage.
2. **Automated Solenoid Cutoff:** Introduce relay-controlled electro-valves for automated isolation upon persistent loss detection.
3. **Acoustic / Pressure Sensor Fusion:** Integrate acoustic leak sensors and pressure transducers to cross-validate flow differential anomalies.
4. **Seasonal ARIMA / Prophet Modeling:** When months of real data accumulate, incorporate seasonal calendar effects (term vs. semester break).

---

## License

This project is developed under the MIT License for educational and research purposes.
