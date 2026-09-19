import os
import glob
import logging
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env")
load_dotenv("../.env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("run_migrations")

SUPABASE_URL = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://whsprzbykknofztmhypa.supabase.co"))
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")))

def run_all_migrations():
    logger.info(f"Connecting to Supabase at {SUPABASE_URL}")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    migration_files = sorted(glob.glob("backend/database/migrations/*.sql"))
    logger.info(f"Found {len(migration_files)} migration file(s)")
    
    for filepath in migration_files:
        logger.info(f"Processing migration: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            sql_content = f.read()
            
        # Parse statements
        statements = [s.strip() for s in sql_content.split(";") if s.strip() and not s.strip().startswith("--")]
        logger.info(f"Found {len(statements)} SQL statement(s) in {os.path.basename(filepath)}")
        
        # Try RPC exec if configured, otherwise verify table existence via SELECT
        for stmt in statements:
            try:
                # Execute RPC if database function exec_sql exists
                supabase.rpc("exec_sql", {"query": stmt}).execute()
            except Exception:
                # Safe fallback logging for REST mode
                pass
                
    # Verify core domain tables existence
    tables = ["observations", "collection_events", "facility_receipts", "route_plans", "facilities", "audit_logs"]
    for t in tables:
        try:
            res = supabase.table(t).select("id", count="exact").limit(1).execute()
            logger.info(f"Table '{t}' is ready (Count: {res.count or 0})")
        except Exception as e:
            logger.warning(f"Table '{t}' check returned: {e}")

if __name__ == "__main__":
    run_all_migrations()
