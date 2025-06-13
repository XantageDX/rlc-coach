# """
# Pydantic models for AWS tenant account creation and management.
# """

# from pydantic import BaseModel, EmailStr
# from typing import Optional
# from datetime import datetime

# class TenantCreateWithAWS(BaseModel):
#     """Model for creating a new tenant with AWS account provisioning."""
#     name: str
#     email: EmailStr
#     description: str = ""

# class TenantAWSStatus(BaseModel):
#     """Model for tenant AWS account status."""
#     tenant_id: str
#     tenant_name: str
#     status: str  # CREATING, SETTING_UP, READY, FAILED
#     aws_account_id: Optional[str] = None
#     aws_request_id: Optional[str] = None
#     aws_account_email: Optional[str] = None
#     bedrock_kb_id: Optional[str] = None
#     s3_bucket: Optional[str] = None
#     resources_setup: bool = False
#     error_message: Optional[str] = None
#     created_at: datetime
#     updated_at: datetime

# class TenantResponseWithAWS(BaseModel):
#     """Enhanced tenant response model with AWS account information."""
#     id: str
#     name: str
#     email: str
#     description: str = ""
#     status: str
#     aws_account_id: Optional[str] = None
#     aws_account_email: Optional[str] = None
#     bedrock_kb_id: Optional[str] = None
#     s3_bucket: Optional[str] = None
#     resources_setup: bool = False
#     token_limit_millions: int = 20
#     max_users: int = 100
#     created_by: str
#     created_at: str
#     updated_at: str

# class AccountCreationRetryRequest(BaseModel):
#     """Model for retrying failed account creation."""
#     tenant_id: str

# class TenantStatusResponse(BaseModel):
#     """Response model for tenant status checks."""
#     success: bool
#     status: str
#     message: str
#     aws_account_id: Optional[str] = None
#     ready_for_setup: bool = False
#     error: Optional[str] = None

#### PHASE 3.1 ####
"""
Enhanced Pydantic models for AWS tenant account creation and management.
Now includes Phase 3 fields for Knowledge Base and resource management.
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
    """Enhanced model for tenant AWS account status with Phase 3 fields."""
    tenant_id: str
    tenant_name: str
    status: str  # CREATING, SETTING_UP, READY, FAILED
    aws_account_id: Optional[str] = None
    aws_request_id: Optional[str] = None
    aws_account_email: Optional[str] = None
    # NEW Phase 3.1 fields
    s3_bucket_name: Optional[str] = None
    resources_setup: bool = False
    # NEW Phase 3.2 fields
    bedrock_kb_id: Optional[str] = None
    kb_status: Optional[str] = None  # CREATING, SYNCING, READY, FAILED
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class TenantResponseWithAWS(BaseModel):
    """Enhanced tenant response model with Phase 3 AWS resource information."""
    id: str
    name: str
    email: str
    description: str = ""
    status: str
    aws_account_id: Optional[str] = None
    aws_account_email: Optional[str] = None
    # NEW Phase 3.1 fields
    s3_bucket_name: Optional[str] = None
    resources_setup: bool = False
    # NEW Phase 3.2 fields  
    bedrock_kb_id: Optional[str] = None
    kb_status: Optional[str] = None
    # Existing fields
    token_limit_millions: int = 20
    max_users: int = 100
    created_by: str
    created_at: str
    updated_at: str
    # Status indicators for frontend
    ready_for_setup: bool = False
    fully_ready: bool = False

class AccountCreationRetryRequest(BaseModel):
    """Model for retrying failed account creation."""
    tenant_id: str

class TenantStatusResponse(BaseModel):
    """Enhanced response model for tenant status checks."""
    success: bool
    status: str
    message: str
    aws_account_id: Optional[str] = None
    # NEW Phase 3.1 status fields
    s3_bucket_name: Optional[str] = None
    resources_setup: bool = False
    ready_for_setup: bool = False
    fully_ready: bool = False
    # NEW Phase 3.2 status fields
    bedrock_kb_id: Optional[str] = None
    kb_status: Optional[str] = None
    error: Optional[str] = None

# NEW Phase 3.1 Models
class ResourceSetupRequest(BaseModel):
    """Model for triggering resource setup."""
    tenant_id: str

class ResourceSetupResponse(BaseModel):
    """Response model for resource setup operations."""
    success: bool
    message: str
    resources: Optional[dict] = None
    error: Optional[str] = None

class ResourceVerificationResponse(BaseModel):
    """Response model for resource verification."""
    success: bool
    verification: Optional[dict] = None
    error: Optional[str] = None

# NEW Phase 3.2 Models (for next sub-phase)
class KnowledgeBaseCreateRequest(BaseModel):
    """Model for Knowledge Base creation request."""
    tenant_id: str
    name: Optional[str] = None
    description: Optional[str] = None

class KnowledgeBaseResponse(BaseModel):
    """Response model for Knowledge Base operations."""
    success: bool
    knowledge_base_id: Optional[str] = None
    status: Optional[str] = None
    message: str
    error: Optional[str] = None

class KnowledgeBaseStatusResponse(BaseModel):
    """Response model for Knowledge Base status checks."""
    success: bool
    kb_id: str
    status: str  # CREATING, SYNCING, READY, FAILED
    sync_status: Optional[str] = None
    last_sync: Optional[datetime] = None
    document_count: Optional[int] = None
    error: Optional[str] = None