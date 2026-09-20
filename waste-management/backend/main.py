import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.bins import router as bins_router
from backend.app.api.vehicles import router as vehicles_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.ml import router as ml_router
from backend.app.api.collections import router as collections_router
from backend.app.api.onboarding import router as onboarding_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Dedicated Backend Service for SwachhSetu: IoT Ingestion, Fleet Management, ML Predictions & OR-Tools Route Optimization.",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.core.supabase import get_supabase

# Health check with Database Readiness Check
@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    supabase = get_supabase()
    db_status = "disconnected"
    if supabase:
        try:
            res = supabase.table("bins").select("id", count="exact").limit(1).execute()
            db_status = f"connected ({res.count or 0} bins)"
        except Exception as e:
            db_status = f"error: {str(e)}"
    return {
        "status": "healthy" if "connected" in db_status else "degraded",
        "database": db_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

from backend.app.api.forecasting import router as forecasting_router

# Mount sub-routers under /api
app.include_router(bins_router, prefix=settings.API_PREFIX)
app.include_router(vehicles_router, prefix=settings.API_PREFIX)
app.include_router(alerts_router, prefix=settings.API_PREFIX)
app.include_router(ml_router, prefix=settings.API_PREFIX)
app.include_router(forecasting_router, prefix=settings.API_PREFIX)
app.include_router(collections_router, prefix=settings.API_PREFIX)
app.include_router(onboarding_router, prefix=settings.API_PREFIX)

# Also mount ml_router and forecasting_router at root for backwards-compatibility
app.include_router(ml_router)
app.include_router(forecasting_router)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)


