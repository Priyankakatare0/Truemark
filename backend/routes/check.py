# backend/routes/check.py

import os
import tempfile
from uuid import UUID
from typing import List
from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from models.schemas import CheckResponse, MatchResult
from db import supabase_client
from services.similarity import find_similar_images, compute_originality_score, SimilaritySearchError
from core.logging import logger
from core.config import settings
from middleware.rate_limit import limiter

router = APIRouter()

class CheckRequest(BaseModel):
    fingerprint_id: str

@router.post("/check", response_model=CheckResponse, status_code=200)
@limiter.limit(settings.RATE_LIMIT_CHECK)
async def check_similarity(request: Request, check_req: CheckRequest):
    """
    Checks a fingerprint against the database for similar images.
    Returns an originality score and list of top matches, generates a report ID.
    """
    # 1. Validate the fingerprint ID format
    try:
        fp_uuid = UUID(check_req.fingerprint_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid fingerprint ID format. Must be a UUID.")
    
    # 2. Fetch the original fingerprint record
    try:
        fingerprint = supabase_client.get_fingerprint_by_id(str(fp_uuid))
    except Exception as e:
        logger.error(f"Database error fetching fingerprint {fp_uuid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error retrieving fingerprint")
        
    if not fingerprint:
        raise HTTPException(
            status_code=404,
            detail=f"Fingerprint {check_req.fingerprint_id} not found"
        )
    
    # 3. Run similarity search against all other fingerprints
    try:
        # Get the clip vector from the original fingerprint
        original_clip_vector = fingerprint.get("clip_vector")
        if not original_clip_vector:
            raise HTTPException(status_code=500, detail="Fingerprint missing CLIP vector data")
            
        # Run similarity search in threadpool to avoid blocking
        similar_images = await run_in_threadpool(
            find_similar_images,
            original_clip_vector,
            str(fp_uuid),
            10,
            fingerprint.get("phash"),
        )
    except SimilaritySearchError as e:
        logger.error(f"Similarity search failed for {fp_uuid}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Similarity analysis failed: {str(e)}"
        )
    
    # 4. Calculate originality score using threshold-based top-match scoring
    originality_score = compute_originality_score(similar_images)
    
    # 5. Format matches for response
    matches: List[MatchResult] = []
    for sim in similar_images:
        matches.append(MatchResult(
            fingerprint_id=UUID(sim["fingerprint_id"]),
            file_name=sim["file_name"],
            similarity_score=float(sim["similarity_score"]),
            is_sample=bool(sim.get("is_sample", False))
        ))
    
    # 6. Save the report to the database for later PDF generation
    try:
        report_record = supabase_client.insert_report(
            fingerprint_id=str(fp_uuid),
            originality_score=originality_score,
            top_matches=similar_images
        )
        report_id = UUID(report_record["id"])
    except Exception as e:
        logger.error(f"Failed to save report for {fp_uuid}: {e}", exc_info=True)
        # Still return the results even if we can't save the report
        report_id = fp_uuid
    
    logger.info(f"Successfully completed similarity check for {fp_uuid}. Originality score: {originality_score}%. Found {len(matches)} matches.")
    
    # 7. Return the response matching the frontend's expected schema
    return CheckResponse(
        fingerprint_id=fp_uuid,
        originality_score=originality_score,
        top_matches=matches,
        report_id=report_id
    )