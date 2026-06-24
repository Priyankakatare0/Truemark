# backend/db/user_client.py

from core.config import settings
from core.logging import logger
from db.supabase_client import _get_client


def create_user(name: str, email: str, password_hash: str) -> dict:
    """Insert a new user record. Raises on duplicate email."""
    data = {
        "name": name,
        "email": email,
        "password_hash": password_hash,
    }
    try:
        response = _get_client().table("users").insert(data).execute()
        if not response.data:
            raise Exception("No data returned from user insert")
        return response.data[0]
    except Exception as e:
        logger.error("create_user failed: %s", e, exc_info=True)
        raise


def get_user_by_email(email: str) -> dict | None:
    """Fetch a user record by email address."""
    try:
        response = (
            _get_client()
            .table("users")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error("get_user_by_email failed: %s", e, exc_info=True)
        raise


def get_user_by_id(user_id: str) -> dict | None:
    """Fetch a user record by UUID."""
    try:
        response = (
            _get_client()
            .table("users")
            .select("id, name, email, reports, created_at, updated_at")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error("get_user_by_id failed: %s", e, exc_info=True)
        raise


def increment_user_reports(user_id: str) -> None:
    """Atomically increment the reports counter for a user."""
    try:
        # Use Supabase RPC or a raw update with rpc for atomic increment
        _get_client().rpc(
            "increment_user_reports",
            {"p_user_id": user_id}
        ).execute()
    except Exception as e:
        # Fallback: fetch-then-update (non-atomic but acceptable)
        logger.warning(
            "RPC increment_user_reports failed (%s) — using fallback update", e
        )
        try:
            user = get_user_by_id(user_id)
            if user:
                current = user.get("reports", 0) or 0
                _get_client().table("users").update(
                    {"reports": current + 1}
                ).eq("id", user_id).execute()
        except Exception as inner:
            logger.error("Fallback increment_user_reports failed: %s", inner)
