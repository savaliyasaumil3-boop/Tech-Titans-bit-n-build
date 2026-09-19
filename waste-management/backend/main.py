import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.bins import router as bins_router
from backend.app.api.vehicles import router as vehicles_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.ml import router as ml_router

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

# Health check
@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

# Mount sub-routers under /api
app.include_router(bins_router, prefix=settings.API_PREFIX)
app.include_router(vehicles_router, prefix=settings.API_PREFIX)
app.include_router(alerts_router, prefix=settings.API_PREFIX)
app.include_router(ml_router, prefix=settings.API_PREFIX)

# Also mount ml_router at root for backwards-compatibility (/predict-fill, /optimize-route)
app.include_router(ml_router)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
