import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional

# Load .env / .env.local file from current directory or parent
load_dotenv(".env.local")
load_dotenv(".env")
load_dotenv("../.env.local")
load_dotenv("../.env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "SwachhSetu Backend API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Supabase credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://whsprzbykknofztmhypa.supabase.co"))
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")))
    
    # Depot coordinates (Ahmedabad Municipal Corporation / Central Depot)
    DEPOT_LAT: float = 23.0225
    DEPOT_LNG: float = 72.5714
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in [
            os.getenv("FRONTEND_URL", "http://localhost:3000"),
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ] if origin.strip() and origin.strip() != "*"
    ]

    class Config:
        extra = "ignore"

settings = Settings()

