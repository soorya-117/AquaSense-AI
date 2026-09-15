"""SQLite database management for AquaSense AI."""

import sqlite3
from contextlib import contextmanager
from typing import Generator
from backend.app.config import settings


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    """Create a new SQLite connection with Row factory enabled."""
    target_path = db_path or settings.DB_PATH
    conn = sqlite3.connect(target_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db(db_path: str | None = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite database transactions."""
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: str | None = None) -> None:
    """Initialize SQLite database and create sensor_readings table if not exists."""
    with get_db(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
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
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp
            ON sensor_readings(timestamp);
            """
        )
