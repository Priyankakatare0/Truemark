# backend/routes/report.py

import os
import tempfile
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response

from models.schemas import FingerprintDetail, CheckResponse, MatchResult
from db import supabase_client
from services.pdf_generator import generate_proof_report, PDFGenerationError
from core.logging import logger

router = APIRouter()


def _read_pdf_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


@router.get("/report/{id}", status_code=200)
async def get_report(id: UUID):
    """
    Generate or retrieve the check report PDF and return it inline.
    Also uploads to Supabase Storage when configured.
    """
    try:
        report = supabase_client.get_report_by_id(str(id))
    except Exception as e:
        logger.error("Error fetching report %s: %s", id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Database error retrieving report") from e

    if not report:
        raise HTTPException(status_code=404, detail=f"Report with ID {id} not found")

    storage_file_name = f"{id}.pdf"
    temp_pdf_path = os.path.join(tempfile.gettempdir(), f"report_{id}.pdf")

    try:
        fingerprint_record = supabase_client.get_fingerprint_by_id(report["fingerprint_id"])
        if not fingerprint_record:
            raise HTTPException(status_code=404, detail="Original fingerprint record not found")

        created_at_str = fingerprint_record["created_at"]
        try:
            created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        except Exception:
            created_at = datetime.now()

        fingerprint_detail = FingerprintDetail(
            id=UUID(fingerprint_record["id"]),
            file_name=fingerprint_record["file_name"],
            file_hash=fingerprint_record["file_hash"],
            phash=fingerprint_record["phash"],
            owner_label=fingerprint_record.get("owner_label"),
            is_sample=bool(fingerprint_record.get("is_sample", False)),
            created_at=created_at,
        )

        matches = []
        for match_dict in report.get("top_matches") or []:
            matches.append(
                MatchResult(
                    fingerprint_id=UUID(match_dict["fingerprint_id"]),
                    file_name=match_dict["file_name"],
                    similarity_score=float(match_dict["similarity_score"]),
                    is_sample=bool(match_dict.get("is_sample", False)),
                )
            )

        check_result = CheckResponse(
            fingerprint_id=UUID(report["fingerprint_id"]),
            originality_score=float(report["originality_score"]),
            top_matches=matches,
            report_id=id,
        )

        await run_in_threadpool(
            generate_proof_report,
            fingerprint_detail,
            check_result,
            temp_pdf_path,
        )

        pdf_bytes = _read_pdf_bytes(temp_pdf_path)

        try:
            signed_url = supabase_client.upload_pdf_to_storage(temp_pdf_path, storage_file_name)
            supabase_client.update_report_pdf_url(str(id), signed_url)
            logger.info("Report PDF uploaded to storage for ID %s", id)
        except Exception as storage_error:
            logger.warning("Storage upload failed, serving PDF inline: %s", storage_error)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="truemark-report-{id}.pdf"'
            },
        )

    except PDFGenerationError as e:
        logger.error("PDF generation error for report %s: %s", id, e, exc_info=True)
        return JSONResponse(
            status_code=200,
            content={
                "pdf_generation_failed": True,
                "error": "Failed to compile PDF report",
                "detail": str(e),
                "report_id": str(id),
                "fingerprint_id": report["fingerprint_id"],
                "originality_score": report["originality_score"],
                "top_matches": report.get("top_matches"),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error serving report PDF for %s: %s", id, e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Unexpected error occurred during PDF generation",
        ) from e
    finally:
        if os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
            except OSError as e:
                logger.warning("Could not delete temp PDF %s: %s", temp_pdf_path, e)
