from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, Any, List
from datetime import datetime


# API response / error models

class ErrorResponse(BaseModel):
    error: str
    detail: str


class UploadResponse(BaseModel):
    fingerprint_id: UUID
    file_name: str
    file_hash: str
    is_duplicate: bool
    created_at: datetime


class MatchResult(BaseModel):
    fingerprint_id: UUID
    file_name: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    is_sample: bool = False


class CheckResponse(BaseModel):
    fingerprint_id: UUID
    originality_score: float = Field(ge=0.0, le=100.0)
    top_matches: List[MatchResult]
    report_id: UUID


class FingerprintDetail(BaseModel):
    id: UUID
    file_name: str
    file_hash: str
    phash: str
    owner_label: Optional[str] = None
    is_sample: bool = False
    created_at: datetime


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