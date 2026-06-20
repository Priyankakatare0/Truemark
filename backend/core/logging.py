# backend/core/logging.py

import logging
import sys

from core.config import settings

logger = logging.getLogger("truemark")

if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    if settings.ENVIRONMENT == "production":
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","message":"%(message)s"}'
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    logger.propagate = False
