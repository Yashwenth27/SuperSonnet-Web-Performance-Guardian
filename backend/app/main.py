from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import settings
from app.database import engine
from app import models
from app.routes import metrics, errors, audits, agent_chat

# Initialize SQLite database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Autonomous web performance auditor and Web Vitals compliancy checker.",
    version=settings.VERSION
)

# CORS middleware enabling Chrome Extension and external SDK connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local dashboard and browser extension integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(metrics.router, prefix="/api")
app.include_router(errors.router, prefix="/api")
app.include_router(audits.router, prefix="/api")
app.include_router(agent_chat.router, prefix="/api")

# Serve the SDK script directly
SDK_PATH = Path(__file__).resolve().parent.parent.parent / "extension" / "content.js"

@app.get("/sdk/perf-sdk.js")
def get_sdk():
    """
    Returns the drop-in performance monitoring SDK.
    """
    if SDK_PATH.exists():
        return FileResponse(SDK_PATH, media_type="application/javascript")
    return {"error": "SDK script not found. Please compile the extension first."}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }
