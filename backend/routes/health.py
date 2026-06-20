# backend/routes/health.py

from fastapi import APIRouter, Request
from core.config import settings

router = APIRouter()

@router.get("/", status_code=200)
async def health_check(request: Request):
    """
    Root endpoint - returns basic API health status.
    Used by frontend to check if backend is reachable.
    """
    return {
        "status": "healthy",
        "service": "TrueMark Backend API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": __import__("datetime").datetime.now().isoformat()
    }

@router.get("/health", status_code=200)
async def detailed_health(request: Request):
    """
    Detailed health check endpoint.
    Verifies database connection and service availability.
    """
    try:
        # Test Supabase connection
        from db import supabase_client
        # Simple query to verify DB is reachable
        test = supabase_client._get_client().table("fingerprints").select("id").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        db_status = f"unavailable: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "TrueMark Backend API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": __import__("datetime").datetime.now().isoformat()
    }