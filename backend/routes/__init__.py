# backend/routes/__init__.py

from .health import router as health_router
from .upload import router as upload_router
from .check import router as check_router
from .report import router as report_router
from .fingerprint import router as fingerprint_router
from .auth import router as auth_router
from .user import router as user_router
from .notion import router as notion_router

# List of all routers to be included in the main app
all_routers = [
    health_router,
    auth_router,       # Auth must be before upload/check so /auth/* paths are resolved first
    upload_router,
    check_router,
    report_router,
    fingerprint_router,
    user_router,       # User history & stats endpoints
    notion_router,     # Notion export integration
]