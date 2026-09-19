import logging
from typing import Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

supabase_client = None

try:
    if settings.SUPABASE_URL and settings.SUPABASE_KEY and "your-project" not in settings.SUPABASE_URL:
        from supabase import create_client, Client
        supabase_client: Optional[Client] = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Connected to Supabase at %s", settings.SUPABASE_URL)
    else:
        logger.warning("Supabase credentials not configured; running in standalone memory mode.")
except Exception as e:
    logger.error("Failed to initialize Supabase client: %s", e)
    supabase_client = None

def get_supabase():
    return supabase_client
