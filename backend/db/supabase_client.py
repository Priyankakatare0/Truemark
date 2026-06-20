# backend/db/supabase_client.py

from supabase import create_client, Client
from core.config import settings
from core.logging import logger

# Lazy client — initialized on first use so tests can mock before connection
_supabase_client: Client | None = None

def _get_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        # Use service role key to bypass RLS policies on the server.
        # If SUPABASE_SERVICE_ROLE is the anon key (common misconfiguration), RLS
        # policies set in 002_rls_policies.sql will allow anon operations instead.
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client

def _extract_signed_url(response) -> str:
    """
    Robustly extract signed URL from various supabase-py response formats.
    The SDK changed the response structure between versions — this handles all of them.
    """
    if isinstance(response, str):
        return response
    if isinstance(response, dict):
        return response.get("signedURL") or response.get("signed_url") or response.get("url", "")
    # supabase-py >= 2.x returns an object with signed_url attribute
    for attr in ("signed_url", "signedURL", "url"):
        val = getattr(response, attr, None)
        if val:
            return val
    raise ValueError(f"Cannot extract signed URL from response: {response!r}")

# =========================
# Fingerprints Table
# =========================

def insert_fingerprint(
    file_name: str,
    file_hash: str,
    phash: str,
    clip_vector: list,
    owner_label: str = None,
    is_sample: bool = False
) -> dict:
    """Insert a fingerprint record."""
    data = {
        "file_name": file_name,
        "file_hash": file_hash,
        "phash": phash,
        "clip_vector": clip_vector,
        "owner_label": owner_label,
        "is_sample": is_sample
    }
    try:
        response = _get_client().table("fingerprints").insert(data).execute()
        if not response.data:
            raise Exception("No data returned from insert operation")
        return response.data[0]
    except Exception as e:
        logger.error(f"Supabase insert_fingerprint failed: {e}", exc_info=True)
        raise e

def get_fingerprint_by_hash(file_hash: str) -> dict | None:
    """Used for duplicate check. Looks up fingerprint by file SHA256 hash."""
    try:
        response = _get_client().table("fingerprints").select("*").eq("file_hash", file_hash).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Supabase get_fingerprint_by_hash failed: {e}", exc_info=True)
        raise e

def get_fingerprint_by_id(fingerprint_id: str) -> dict | None:
    """Fetch fingerprint details by UUID."""
    try:
        response = _get_client().table("fingerprints").select("*").eq("id", fingerprint_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Supabase get_fingerprint_by_id failed: {e}", exc_info=True)
        raise e

def get_all_fingerprint_vectors() -> list[dict]:
    """Get all fingerprint vectors. Used as a fallback or general retrieval."""
    try:
        response = _get_client().table("fingerprints").select("id, file_name, clip_vector, is_sample").execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Supabase get_all_fingerprint_vectors failed: {e}", exc_info=True)
        raise e

def native_vector_search(query_vector: list[float], match_count: int = 5, exclude_id: str = None) -> list[dict]:
    """Perform native pgvector cosine similarity search using the match_fingerprints RPC function."""
    try:
        params = {
            "query_embedding": query_vector,
            "match_threshold": -1.0,
            "match_count": match_count,
        }
        if exclude_id:
            params["exclude_id"] = exclude_id
        response = _get_client().rpc("match_fingerprints", params).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Supabase RPC match_fingerprints failed: {e}", exc_info=True)
        logger.warning("Falling back to python-side similarity computation")
        return []

# =========================
# Reports Table
# =========================

def insert_report(
    fingerprint_id: str,
    originality_score: float,
    top_matches: list,
    pdf_url: str = None
) -> dict:
    """Insert a check report record."""
    data = {
        "fingerprint_id": fingerprint_id,
        "originality_score": originality_score,
        "top_matches": top_matches,
        "pdf_url": pdf_url
    }
    try:
        response = _get_client().table("reports").insert(data).execute()
        if not response.data:
            raise Exception("No data returned from insert_report")
        return response.data[0]
    except Exception as e:
        logger.error(f"Supabase insert_report failed: {e}", exc_info=True)
        raise e

def get_report_by_id(report_id: str) -> dict | None:
    """Fetch report by UUID."""
    try:
        response = _get_client().table("reports").select("*").eq("id", report_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Supabase get_report_by_id failed: {e}", exc_info=True)
        raise e

def update_report_pdf_url(report_id: str, pdf_url: str) -> dict:
    """Update the pdf_url in an existing report."""
    try:
        response = _get_client().table("reports").update({"pdf_url": pdf_url}).eq("id", report_id).execute()
        if not response.data:
            raise Exception(f"No report found to update for ID: {report_id}")
        return response.data[0]
    except Exception as e:
        logger.error(f"Supabase update_report_pdf_url failed: {e}", exc_info=True)
        raise e

# =========================
# Storage Bucket (reports)
# =========================

def upload_pdf_to_storage(local_path: str, storage_path: str) -> str:
    """Upload PDF to reports bucket and return a signed URL with 1-hour expiry."""
    try:
        with open(local_path, "rb") as f:
            _get_client().storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "application/pdf", "x-upsert": "true"}
            )
        signed_url_response = _get_client().storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(
            path=storage_path, expires_in=3600
        )
        return _extract_signed_url(signed_url_response)
    except Exception as e:
        logger.error(f"Supabase upload_pdf_to_storage failed: {e}", exc_info=True)
        raise e

def get_report_signed_url(storage_path: str) -> str:
    """Generate a signed URL for an existing file in the storage bucket."""
    try:
        response = _get_client().storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(
            path=storage_path, expires_in=3600
        )
        return _extract_signed_url(response)
    except Exception as e:
        logger.error(f"Supabase get_report_signed_url failed: {e}", exc_info=True)
        raise e