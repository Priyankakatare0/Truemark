# backend/routes/report.py

import os
import tempfile
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool

from models.schemas import FingerprintDetail, CheckResponse, MatchResult
from db import supabase_client
from services.pdf_generator import generate_proof_report, PDFGenerationError
from core.logging import logger

router = APIRouter()

@router.get("/report/{id}", status_code=200)
async def get_report(id: UUID):
    """
    Retrieves the check report PDF. If it does not exist, generates it,
    saves it to Supabase Storage, and redirects to the signed download URL.
    """
    # 1. Fetch the report row
    try:
        report = supabase_client.get_report_by_id(str(id))
    except Exception as e:
        logger.error(f"Error fetching report {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error retrieving report")
        
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report with ID {id} not found"
        )
        
    storage_file_name = f"{id}.pdf"
    
    # 2. If PDF already generated, get signed URL and redirect
    if report.get("pdf_url"):
        try:
            signed_url = supabase_client.get_report_signed_url(storage_file_name)
            logger.info(f"Serving cached report PDF for ID {id}")
            return RedirectResponse(url=signed_url, status_code=303)
        except Exception as e:
            logger.warning(f"Failed to generate signed URL for cached PDF, will regenerate: {e}")
            
    # 3. PDF not generated yet - initialize temp_pdf_path before try block to avoid NameError in finally
    temp_pdf_path = None
    temp_pdf_path = os.path.join(tempfile.gettempdir(), f"report_{id}.pdf")
    
    try:
        # Fetch fingerprint detail
        fingerprint_record = supabase_client.get_fingerprint_by_id(report["fingerprint_id"])
        if not fingerprint_record:
            raise HTTPException(status_code=404, detail="Original fingerprint record not found")
            
        # Parse timestamp
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
            created_at=created_at
        )
        
        # Build check response object for pdf generator
        matches = []
        for match_dict in report.get("top_matches") or []:
            matches.append(MatchResult(
                fingerprint_id=UUID(match_dict["fingerprint_id"]),
                file_name=match_dict["file_name"],
                similarity_score=float(match_dict["similarity_score"]),
                is_sample=bool(match_dict.get("is_sample", False))
            ))
            
        check_result = CheckResponse(
            fingerprint_id=UUID(report["fingerprint_id"]),
            originality_score=float(report["originality_score"]),
            top_matches=matches,
            report_id=id
        )
        
        # Generate the PDF file in a threadpool (blocking file writing)
        await run_in_threadpool(
            generate_proof_report,
            fingerprint_detail,
            check_result,
            temp_pdf_path
        )
        
        # Upload the PDF to Supabase storage and get a signed URL
        try:
            signed_url = supabase_client.upload_pdf_to_storage(temp_pdf_path, storage_file_name)
            
            # Update the report row with pdf_url
            supabase_client.update_report_pdf_url(str(id), signed_url)
            
            logger.info(f"Successfully generated and uploaded report PDF for ID {id}")
            return RedirectResponse(url=signed_url, status_code=303)
        except Exception as storage_error:
            logger.warning(f"Supabase Storage upload failed, serving PDF directly: {storage_error}")
            # Fallback: serve the PDF directly from the temp file
            from fastapi.responses import FileResponse
            return FileResponse(
                path=temp_pdf_path,
                media_type="application/pdf",
                filename=f"truemark-report-{id}.pdf"
            )
        
    except PDFGenerationError as e:
        logger.error(f"PDF generation error for report {id}: {e}", exc_info=True)
        # Graceful fallback: return the similarity check data as JSON with a pdf_generation_failed flag
        return JSONResponse(
            status_code=200,
            content={
                "pdf_generation_failed": True,
                "error": "Failed to compile PDF report",
                "detail": str(e),
                "report_id": str(id),
                "fingerprint_id": report["fingerprint_id"],
                "originality_score": report["originality_score"],
                "top_matches": report.get("top_matches")
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error serving report PDF for report {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Unexpected error occurred during PDF generation"
        )
    finally:
        # Clean up local temp file
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
            except Exception as e:
                logger.warning(f"Could not delete temp PDF file {temp_pdf_path}: {e}")
