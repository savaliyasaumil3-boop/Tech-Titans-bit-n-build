"""
Seed script in Python to push sample bins, vehicles, and alerts to Supabase.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

try:
    from supabase import create_client
except ImportError:
    print("Please install supabase library: pip install supabase")
    sys.exit(1)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Missing Supabase URL or Key in .env")
    sys.exit(1)

client = create_client(supabase_url, supabase_key)
print(f"Connected to {supabase_url}. Tip: To bypass RLS and create schemas, run backend/database/schema.sql and backend/database/seed.sql directly in the Supabase SQL Editor.")
