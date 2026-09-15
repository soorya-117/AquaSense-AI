# AquaSense AI – Project Rules & Guidelines

## 1. Project Mission & Identity
**AquaSense AI** is an intelligent campus water management system designed as an experimental prototype for monitoring water flow, detecting potential pipe losses, and providing campus analytics.
- **Hardware Pipeline:** ESP32 → Wi-Fi → FastAPI → SQLite → React Dashboard → Analytics/ML
- **Context:** Experimental college prototype, NOT a commercial or life-critical leak-detection system.
- **Disclaimer:** A flow rate difference between upstream and downstream indicates possible water leaving the measured path; it does **not** definitively prove a pipe leak (e.g. intermediate taps, sensor drift, or air pockets).

---

## 2. Hardware Architecture & Sensor Placement
- **Microcontroller:** ESP32
- **Sensor 1:** YF-S401 Flow Sensor (Upstream) → GPIO27
- **Sensor 2:** YF-S401 Flow Sensor (Downstream) → GPIO26
- **Actuation:** Water Pump (Manual switching)
- **Path Layout:** `Pump` → `Sensor 1 (Upstream)` → `[Potential Loss / Intermediate Outlet]` → `Sensor 2 (Downstream)` → `Outlet 2`

---

## 3. ESP32 Data Ingestion Contract (Strict)
The ESP32 firmware transmits data using:
- **Endpoint:** `POST /data`
- **Content-Type:** `application/json`
- **Payload Schema:**
  ```json
  {
    "sensor1_pulses": <number>,
    "sensor2_pulses": <number>
  }
  ```
*Rule:* **Never break or modify this contract.** Any backward-incompatible changes to this endpoint or payload will break the physical ESP32 device communication.

---

## 4. Status Determination Rules
The system uses exactly three standardized statuses:
1. `NORMAL`:
   - System is idle (no flow), or flow difference between upstream and downstream is within calibrated noise margins.
2. `POSSIBLE WATER LOSS`:
   - Upstream flow exceeds downstream flow beyond the configured loss threshold (`sensor1_flow - sensor2_flow > FLOW_DIFFERENCE_THRESHOLD_LMIN`).
3. `SENSOR/CALIBRATION ANOMALY`:
   - Downstream flow physically exceeds upstream flow beyond tolerance (`sensor2_flow > sensor1_flow + ANOMALY_TOLERANCE_LMIN`), or invalid negative readings are reported.

---

## 5. Technology Stack & Boundaries
- **Backend:** Python with **FastAPI**
- **Database:** **SQLite** (`sensor_readings` table). Keep it lightweight, local, and file-based.
- **Frontend (Future):** React + Vite, Tailwind CSS, Recharts.
- **Machine Learning (Future):** pandas + scikit-learn for time-series and anomaly analytics.

### Prohibitions:
- ❌ **NO Firebase** (No Firestore, Realtime DB, or Auth)
- ❌ **NO Microservices** (Keep single unified modular monolith)
- ❌ **NO Kubernetes / Docker Swarm**
- ❌ **NO Kafka / RabbitMQ / Redis**
- ❌ **NO Unnecessary WebSockets** (Use clean REST polling/SSE for dashboard)
- ❌ **NO Deep Learning** (Avoid heavyweight PyTorch/TensorFlow networks; use interpretable statistical/classical ML)
- ❌ **NO Fake Sensor Data** generated inside backend to masquerade as live ESP32 data. Test fixtures belong strictly in tests.

---

## 6. Development & Code Quality Rules
- **Configurable Calibration:** Sensor calibration factors (pulses-per-liter, sample interval, thresholds) must be configurable (via config/env variables), never hard-coded inline.
- **Safe Math:** Always guard divisions (e.g. `flow_ratio = sensor2_flow / sensor1_flow`) against zero division.
- **Simplicity Over Engineering:** Build clear, readable code. Avoid unnecessary abstractions.
- **Test Coverage:** Every endpoint, service calculation, and edge case must have automated tests.
- **Preserve Existing Interfaces:** Do not rename or remove existing API endpoints once deployed.
