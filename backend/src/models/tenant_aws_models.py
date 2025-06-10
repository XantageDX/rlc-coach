"""
Pydantic models for AWS tenant account creation and management.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class TenantCreateWithAWS(BaseModel):
    """Model for creating a new tenant with AWS account provisioning."""
    name: str
    email: EmailStr
    description: str = ""

class TenantAWSStatus(BaseModel):
    """Model for tenant AWS account status."""
    tenant_id: str
    tenant_name: str
    status: str  # CREATING, SETTING_UP, READY, FAILED
    aws_account_id: Optional[str] = None
    aws_request_id: Optional[str] = None
    aws_account_email: Optional[str] = None
    bedrock_kb_id: Optional[str] = None
    s3_bucket: Optional[str] = None
    resources_setup: bool = False
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class TenantResponseWithAWS(BaseModel):
    """Enhanced tenant response model with AWS account information."""
    id: str
    name: str
    email: str
    description: str = ""
    status: str
    aws_account_id: Optional[str] = None
    aws_account_email: Optional[str] = None
    bedrock_kb_id: Optional[str] = None
    s3_bucket: Optional[str] = None
    resources_setup: bool = False
    token_limit_millions: int = 20
    max_users: int = 100
    created_by: str
    created_at: str
    updated_at: str

class AccountCreationRetryRequest(BaseModel):
    """Model for retrying failed account creation."""
    tenant_id: str

class TenantStatusResponse(BaseModel):
    """Response model for tenant status checks."""
    success: bool
    status: str
    message: str
    aws_account_id: Optional[str] = None
    ready_for_setup: bool = False
    error: Optional[str] = None