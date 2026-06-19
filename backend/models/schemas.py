from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Any
from datetime import datetime


# fingerprints table

class FingerprintCreate(BaseModel):
    file_name: str
    file_hash: str
    phash: str
    clip_vector: list[float]
    owner_label: Optional[str] = None
    is_sample: bool = False


class Fingerprint(BaseModel):
    id: UUID
    file_name: str
    file_hash: str
    phash: str
    clip_vector: list[float]
    owner_label: Optional[str]
    is_sample: bool
    created_at: datetime


# reports table

class ReportCreate(BaseModel):
    fingerprint_id: UUID
    originality_score: float
    top_matches: Any
    pdf_url: Optional[str] = None


class Report(BaseModel):
    id: UUID
    fingerprint_id: UUID
    originality_score: float
    top_matches: Any
    pdf_url: Optional[str]
    created_at: datetime