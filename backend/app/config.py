import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    PROJECT_NAME: str = "ComplianceAgent AI - Frontend Performance Auditor"
    VERSION: str = "1.0.0"
    
    # SQLite Configuration
    DATABASE_DIR: Path = BASE_DIR / "data"
    DATABASE_URL: str = f"sqlite:///{DATABASE_DIR}/app.db"
    
    # AI Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()

# Ensure data directory exists
settings.DATABASE_DIR.mkdir(parents=True, exist_ok=True)
