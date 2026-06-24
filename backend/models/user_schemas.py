# backend/models/user_schemas.py

from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID
from typing import Optional
from datetime import datetime


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Display name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name cannot be blank")
        return stripped


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Safe user response model — never exposes password_hash."""
    id: UUID
    name: str
    email: str
    reports: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenPayload(BaseModel):
    sub: str          # user_id
    name: str
    email: str
    exp: Optional[int] = None
