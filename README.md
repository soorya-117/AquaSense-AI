# AquaSense AI – Intelligent Campus Water Management

Backend foundation for **AquaSense AI**, an intelligent campus water management system that ingests telemetry from an ESP32 microcontroller with dual YF-S401 flow sensors, analyzes flow differentials, detects potential water loss or sensor anomalies, and provides clean REST APIs for dashboard visualization and analytics.

---

## 1. System Pipeline & Hardware

```
[Water Pump] 
      ↓
[Flow Sensor 1: YF-S401 (GPIO27)] (Upstream)
      ↓
[Pipe Segment / Potential Loss]
      ↓
[Flow Sensor 2: YF-S401 (GPIO26)] (Downstream)
      ↓
   [Outlet 2]
```

- **Pipeline:** `ESP32` → `Wi-Fi` → `FastAPI` → `SQLite` → `React Dashboard` → `Analytics/ML`
- **Device Ingestion Contract:** `POST /data` with `{"sensor1_pulses": <int>, "sensor2_pulses": <int>}`

---

## 2. API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/data` | **ESP32 Ingestion**: Accepts raw pulse counts, computes flow & volume, determines status, and saves to SQLite. |
| `GET` | `/api/live` | **Live State**: Returns the latest reading and operational status (`NORMAL`, `POSSIBLE WATER LOSS`, `SENSOR/CALIBRATION ANOMALY`). |
| `GET` | `/api/history` | **History**: Returns paginated historical readings (`limit`, `offset`). |
| `GET` | `/api/analytics/summary`| **Analytics**: Returns total readings, cumulative volumes, average flow rates, and status distributions. |
| `GET` | `/api/health` | **Healthcheck**: Returns system health, database status, and total recorded rows. |
| `GET` | `/docs` | Interactive Swagger API documentation. |

---

## 3. Sensor Calibration & Configuration

All sensor calibration parameters and detection thresholds are fully configurable via environment variables (or `.env` file):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `AQUASENSE_CALIBRATION_S1` | `5880.0` | Calibration factor for Sensor 1 (pulses per Liter for YF-S401). |
| `AQUASENSE_CALIBRATION_S2` | `5880.0` | Calibration factor for Sensor 2 (pulses per Liter for YF-S401). |
| `AQUASENSE_SAMPLE_INTERVAL` | `1.0` | Reporting interval in seconds for pulse accumulation. |
| `AQUASENSE_LOSS_THRESHOLD_LMIN` | `0.15` | Flow difference threshold in L/min triggering `POSSIBLE WATER LOSS`. |
| `AQUASENSE_ANOMALY_TOLERANCE_LMIN` | `0.10` | Tolerance in L/min above which downstream > upstream triggers `SENSOR/CALIBRATION ANOMALY`. |
| `AQUASENSE_DB_PATH` | `aquasense.db` | Path to the SQLite database file. |

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.11)

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/soorya-117/AquaSense-AI.git
cd AquaSense-AI

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
```

### Running the Backend Server
```bash
# Start FastAPI development server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser for interactive API documentation.

### Running Automated Tests
```bash
python -m pytest backend/tests/test_api.py -v
```

---

## 5. Status Determination Rules

- **`NORMAL`**: Idle state (no water flow), or flow difference between upstream and downstream is within calibrated tolerance.
- **`POSSIBLE WATER LOSS`**: Upstream flow exceeds downstream flow beyond the configured threshold (`sensor1_flow - sensor2_flow > FLOW_DIFFERENCE_THRESHOLD_LMIN`).
- **`SENSOR/CALIBRATION ANOMALY`**: Downstream flow physically exceeds upstream flow beyond tolerance margin, or invalid negative pulse counts are received.

---

## 6. Project Rules

Refer to [PROJECT_RULES.md](file:///c:/Users/soory/Downloads/AquaSense-AI/PROJECT_RULES.md) for strict architectural and development guidelines.
