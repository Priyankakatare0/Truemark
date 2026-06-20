# backend/routes/fingerprint.py

import os
from uuid import UUID
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from db import supabase_client
from core.logging import logger
from core.config import settings
from middleware.rate_limit import limiter

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@router.get("/fingerprint/{id}/thumbnail", status_code=200)
@limiter.limit(settings.RATE_LIMIT_CHECK)
async def get_fingerprint_thumbnail(request: Request, id: UUID):
    """Serve the stored upload thumbnail for a fingerprint."""
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        path = os.path.join(UPLOADS_DIR, f"{id}{ext}")
        if os.path.exists(path):
            media = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"
            return FileResponse(path, media_type=media)
    raise HTTPException(status_code=404, detail="Thumbnail not found for this fingerprint")


@router.get("/fingerprint/{id}", status_code=200)
@limiter.limit(settings.RATE_LIMIT_CHECK)
async def get_fingerprint(request: Request, id: UUID):
    """
    Retrieves metadata for a specific fingerprint by ID.
    Used by the frontend dashboard to display fingerprint details.
    """
    fingerprint_id_str = str(id)
    
    try:
        fingerprint = supabase_client.get_fingerprint_by_id(fingerprint_id_str)
    except Exception as e:
        logger.error(f"Database error fetching fingerprint {fingerprint_id_str}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error retrieving fingerprint")
        
    if not fingerprint:
        raise HTTPException(
            status_code=404,
            detail=f"Fingerprint {fingerprint_id_str} not found"
        )
    
    # Return only the fields the frontend needs, filter out any sensitive data
    return {
        "id": fingerprint["id"],
        "file_name": fingerprint["file_name"],
        "file_hash": fingerprint["file_hash"],
        "phash": fingerprint["phash"],
        "owner_label": fingerprint.get("owner_label"),
        "is_sample": bool(fingerprint.get("is_sample", False)),
        "created_at": fingerprint["created_at"]
    }