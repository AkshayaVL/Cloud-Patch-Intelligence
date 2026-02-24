from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ─── Auth Models ────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str


# ─── Connection Models ───────────────────────────
class ConnectionCreate(BaseModel):
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "us-east-1"
    github_token: str
    github_repo: str


class ConnectionResponse(BaseModel):
    id: str
    aws_access_key_id: str
    aws_region: str
    github_repo: str
    created_at: datetime


# ─── Scan Models ────────────────────────────────
class ScanResponse(BaseModel):
    id: str
    status: str
    total_issues: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    started_at: datetime
    completed_at: Optional[datetime] = None


# ─── Finding Models ─────────────────────────────
class FindingResponse(BaseModel):
    id: str
    resource_id: str
    resource_type: str
    check_id: str
    check_title: str
    severity: str
    explanation: Optional[str] = None
    risk_description: Optional[str] = None
    compliance_references: Optional[str] = None
    terraform_patch: Optional[str] = None
    pr_url: Optional[str] = None
    pr_status: str
    created_at: datetime


# ─── PR Models ──────────────────────────────────
class PRResponse(BaseModel):
    id: str
    pr_number: int
    pr_url: str
    pr_title: Optional[str] = None
    severity: Optional[str] = None
    status: str
    created_at: datetime


# ─── Score Models ───────────────────────────────
class ScoreResponse(BaseModel):
    score: int
    calculated_at: datetime