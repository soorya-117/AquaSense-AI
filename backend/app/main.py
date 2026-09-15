"""AquaSense AI - FastAPI Backend Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database initialization on startup."""
    init_db()
    yield


app = FastAPI(
    title="AquaSense AI Backend",
    description="Intelligent Campus Water Management System API for ESP32 telemetry, flow analysis, and analytics.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for React frontend (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route handlers
app.include_router(router)


@app.get("/", tags=["Root"], summary="API Root Overview")
def read_root():
    """Root endpoint providing quick system information and links to docs."""
    return {
        "system": "AquaSense AI",
        "description": "Intelligent Campus Water Management Backend",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "status": "online",
    }
