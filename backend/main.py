# backend/main.py

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import settings
from core.logging import logger
from models.schemas import ErrorResponse
from services.fingerprint import load_model, FingerprintGenerationError
from services.pdf_generator import PDFGenerationError
from middleware.auth import APIKeyMiddleware
from middleware.rate_limit import limiter
from routes import all_routers

# Define lifespan event for CLIP model pre-loading
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing TrueMark Backend Service...")
    # Pre-load the CLIP model so it's ready for immediate inference
    try:
        load_model()
    except Exception as e:
        logger.critical(f"Failed to load CLIP model on startup: {e}. Exiting.", exc_info=True)
        raise e
    yield
    logger.info("Shutting down TrueMark Backend Service...")

app = FastAPI(
    title="TrueMark Backend API",
    description="AI-powered digital ownership & authenticity platform",
    version="1.0.0",
    lifespan=lifespan
)

# Set up Rate Limiter state
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Set up CORS Allowlist - trim whitespace from each origin to handle spaces after commas
allow_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]
if settings.ENVIRONMENT == "production":
    if not settings.ALLOWED_ORIGINS or settings.ALLOWED_ORIGINS == "*":
        logger.critical("CORS ALLOWED_ORIGINS cannot be empty or '*' in production environment")
        raise ValueError("CORS ALLOWED_ORIGINS cannot be empty or '*' in production environment")
else:
    # Default fallback for development - ensure we always have localhost:3000
    if not allow_origins or allow_origins == [""]:
        allow_origins = ["http://localhost:3000"]
    # Always add the common Vite dev server ports just in case
    additional_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    for origin in additional_origins:
        if origin not in allow_origins:
            allow_origins.append(origin)

# Add Auth Middleware (gated by config settings inside the middleware)
app.add_middleware(APIKeyMiddleware)

# Add CORS Middleware last so it runs first on incoming requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all application routers
for router in all_routers:
    app.include_router(router)

# Register central exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    # Convert errors list to string format
    detail_str = "; ".join([f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in exc.errors()])
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(error="Validation Error", detail=detail_str).model_dump()
    )

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(f"Rate limit exceeded for {request.client.host} on {request.url.path}")
    return JSONResponse(
        status_code=429,
        content=ErrorResponse(error="Rate Limit Exceeded", detail="Too many requests. Please try again later.").model_dump()
    )

@app.exception_handler(FingerprintGenerationError)
async def fingerprint_error_handler(request: Request, exc: FingerprintGenerationError):
    logger.error(f"Fingerprint generation failed on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error="Processing Error", detail=f"Failed to generate image fingerprint: {str(exc)}").model_dump()
    )

@app.exception_handler(PDFGenerationError)
async def pdf_error_handler(request: Request, exc: PDFGenerationError):
    logger.error(f"PDF generation failed on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "pdf_generation_failed": True,
            "error": str(exc),
            "originality_score": getattr(exc, "originality_score", None)
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error="Internal Server Error", detail="An unexpected error occurred. Our team has been notified.").model_dump()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)