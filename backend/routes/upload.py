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
from services.fingerprint import generate_fingerprint
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

    suffix = os.path.splitext(file.filename or "upload.jpg")[1] or ".jpg"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            contents = await file.read()
            tmp.write(contents)

        fp_data = await run_in_threadpool(generate_fingerprint, temp_path)

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
            )
            return JSONResponse(status_code=200, content=payload.model_dump(mode="json"))

        record = supabase_client.insert_fingerprint(
            file_name=file.filename or "upload.jpg",
            file_hash=fp_data["file_hash"],
            phash=fp_data["phash"],
            clip_vector=fp_data["clip_vector"],
            owner_label=owner_label,
            is_sample=False,
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
