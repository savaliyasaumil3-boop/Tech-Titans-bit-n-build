import os
from pydantic_settings import BaseSettings
from typing import Optional

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
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
