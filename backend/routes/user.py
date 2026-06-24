# backend/routes/user.py
"""
User-specific endpoints:
  GET /user/me/fingerprints  — paginated list of caller's fingerprints
  GET /user/me/reports       — paginated list of caller's reports
  GET /user/me/stats         — aggregate stats (total uploads, avg score, etc.)
"""

from fastapi import APIRouter, HTTPException, Query, Request

from core.logging import logger
from db import supabase_client, user_client
from routes.auth import require_user

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me/fingerprints", status_code=200)
async def get_my_fingerprints(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    Return the authenticated user's fingerprint history, newest first.
    Requires valid JWT cookie.
    """
    auth_user = require_user(request)
    user_id = auth_user["sub"]

    try:
        fingerprints = supabase_client.get_fingerprints_by_user_id(user_id, limit=limit, offset=offset)
        total = supabase_client.count_fingerprints_by_user_id(user_id)
    except Exception as e:
        logger.error("Failed to fetch fingerprints for user %s: %s", user_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve your fingerprint history.")

    return {
        "items": fingerprints,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/me/reports", status_code=200)
async def get_my_reports(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    Return the authenticated user's analysis report history, newest first.
    Requires valid JWT cookie.
    """
    auth_user = require_user(request)
    user_id = auth_user["sub"]

    try:
        reports = supabase_client.get_reports_by_user_id(user_id, limit=limit, offset=offset)
    except Exception as e:
        logger.error("Failed to fetch reports for user %s: %s", user_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve your report history.")

    return {
        "items": reports,
        "total": len(reports),
        "limit": limit,
        "offset": offset,
    }


@router.get("/me/stats", status_code=200)
async def get_my_stats(request: Request):
    """
    Return aggregate stats for the authenticated user.
    Requires valid JWT cookie.
    """
    auth_user = require_user(request)
    user_id = auth_user["sub"]

    try:
        user = user_client.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        total_uploads = supabase_client.count_fingerprints_by_user_id(user_id)

        # Compute average originality score from recent reports
        reports = supabase_client.get_reports_by_user_id(user_id, limit=100)
        avg_score = None
        if reports:
            scores = [r["originality_score"] for r in reports if r.get("originality_score") is not None]
            avg_score = round(sum(scores) / len(scores), 1) if scores else None

        return {
            "user_id": user_id,
            "name": user.get("name"),
            "email": user.get("email"),
            "total_uploads": total_uploads,
            "total_reports": user.get("reports", 0),
            "avg_originality_score": avg_score,
            "member_since": user.get("created_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to fetch stats for user %s: %s", user_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve your stats.")
