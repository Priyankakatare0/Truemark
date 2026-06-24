# backend/routes/upload.py

import os
import shutil
import tempfile
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from core.config import settings
from core.logging import logger
from db import supabase_client
from middleware.rate_limit import limiter
from models.schemas import UploadResponse
from routes.auth import get_current_user
from services.fingerprint import generate_fingerprint
from services.similarity import find_similar_images, _SIMILARITY_THRESHOLD
from utils.validation import validate_image_upload

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def _save_upload_copy(fingerprint_id: str, source_path: str, filename: str) -> None:
    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    dest = os.path.join(UPLOADS_DIR, f"{fingerprint_id}{ext}")
    shutil.copy2(source_path, dest)


@router.post("/upload", response_model=UploadResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    owner_label: str | None = Form(default=None),
):
    """Upload an image, generate fingerprint, and store ownership record."""
    await validate_image_upload(file)

    # Extract authenticated user from JWT cookie (optional — graceful if not logged in)
    auth_user = get_current_user(request)
    user_id = auth_user["sub"] if auth_user else None
    # Use the authenticated user's name as owner_label if not explicitly provided
    if not owner_label and auth_user:
        owner_label = auth_user.get("name")

    suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            contents = await file.read()
            tmp.write(contents)

        fp_data = await run_in_threadpool(generate_fingerprint, temp_path)

        # ── Step 1: Exact-hash duplicate check (fast, free DB lookup) ──────────
        existing = supabase_client.get_fingerprint_by_hash(fp_data["file_hash"])
        if existing:
            created_at = existing.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            payload = UploadResponse(
                fingerprint_id=UUID(existing["id"]),
                file_name=existing["file_name"],
                file_hash=existing["file_hash"],
                is_duplicate=True,
                created_at=created_at,
                matched_fingerprint_id=UUID(existing["id"]),
                similarity_score=1.0,
            )
            return JSONResponse(status_code=200, content=payload.model_dump(mode="json"))

        # ── Step 2: Near-duplicate similarity check (before registering) ───────
        # Compare the new image's CLIP vector against every stored fingerprint.
        # If any existing image is above the threshold, treat this upload as a
        # near-duplicate — report the match and do NOT register a new original.
        try:
            near_matches = await run_in_threadpool(
                find_similar_images,
                fp_data["clip_vector"],
                None,          # exclude_id=None — nothing registered yet
                1,             # we only need the single best match
                fp_data["phash"],
            )
        except Exception as sim_err:
            # Similarity search failure is non-fatal — log and continue as original
            logger.warning("Near-duplicate pre-check failed (continuing): %s", sim_err)
            near_matches = []

        if near_matches:
            best = near_matches[0]
            best_score = float(best["similarity_score"])
            if best_score >= _SIMILARITY_THRESHOLD:
                matched_id = best["fingerprint_id"]
                logger.info(
                    "Near-duplicate detected: uploaded file matches existing %s at %.3f similarity",
                    matched_id, best_score,
                )
                # Fetch the matched record for full metadata
                matched_record = supabase_client.get_fingerprint_by_id(matched_id)
                if matched_record:
                    created_at = matched_record.get("created_at")
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    payload = UploadResponse(
                        fingerprint_id=UUID(matched_id),
                        file_name=matched_record["file_name"],
                        file_hash=matched_record["file_hash"],
                        is_duplicate=True,
                        created_at=created_at,
                        matched_fingerprint_id=UUID(matched_id),
                        similarity_score=round(best_score, 4),
                    )
                    return JSONResponse(status_code=200, content=payload.model_dump(mode="json"))

        # ── Step 3: Genuine original — register and save ────────────────────────────────────
        record = supabase_client.insert_fingerprint(
            file_name=file.filename or "upload.jpg",
            file_hash=fp_data["file_hash"],
            phash=fp_data["phash"],
            clip_vector=fp_data["clip_vector"],
            owner_label=owner_label,
            is_sample=False,
            user_id=user_id,
        )

        fingerprint_id = record["id"]
        _save_upload_copy(fingerprint_id, temp_path, file.filename or "upload.jpg")

        created_at = record.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

        logger.info("Fingerprint created: %s for %s", fingerprint_id, file.filename)
        return UploadResponse(
            fingerprint_id=UUID(fingerprint_id),
            file_name=record["file_name"],
            file_hash=record["file_hash"],
            is_duplicate=False,
            created_at=created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Upload failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {e}") from e
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
