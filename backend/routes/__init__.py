# backend/routes/__init__.py

from .health import router as health_router
from .upload import router as upload_router
from .check import router as check_router
from .report import router as report_router
from .fingerprint import router as fingerprint_router

# List of all routers to be included in the main app
all_routers = [
    health_router,
    upload_router,
    check_router,
    report_router,
    fingerprint_router,
]