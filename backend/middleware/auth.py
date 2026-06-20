# backend/middleware/auth.py

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from core.config import settings
from core.logging import logger


class APIKeyMiddleware(BaseHTTPMiddleware):
    """Optional Bearer token auth gated by API_AUTH_ENABLED."""

    EXEMPT_PATHS = {"/", "/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        if not settings.API_AUTH_ENABLED:
            return await call_next(request)

        if request.method == "OPTIONS" or request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "detail": "Missing Bearer token"},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        if not settings.API_KEY or token != settings.API_KEY:
            logger.warning("Invalid API key attempt from %s", request.client.host if request.client else "unknown")
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "detail": "Invalid API key"},
            )

        return await call_next(request)
