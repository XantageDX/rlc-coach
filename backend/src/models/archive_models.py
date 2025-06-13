# # backend/src/models/archive_models.py
# from pydantic import BaseModel, Field, ConfigDict
# from typing import Optional, List, Any
# from bson import ObjectId
# from datetime import datetime

# # Helper function to convert MongoDB ObjectId to string
# def convert_object_id(obj: dict) -> dict:
#     """Convert MongoDB ObjectId to string in a dictionary."""
#     if obj and "_id" in obj and isinstance(obj["_id"], ObjectId):
#         obj["_id"] = str(obj["_id"])
#     return obj

# # Document model for uploaded files
# class DocumentModel(BaseModel):
#     filename: str
#     stored_filename: str
#     path: str
#     uploaded_at: str  # ISO format datetime

# # Project models
# class ProjectBase(BaseModel):
#     name: str
#     description: Optional[str] = None
#     documents: Optional[List[DocumentModel]] = []

# class ProjectCreate(ProjectBase):
#     pass

# class ProjectResponse(ProjectBase):
#     id: str = Field(alias="_id")
    
#     model_config = ConfigDict(
#         populate_by_name=True
#     )

# # Key Decision models for future reference
# class KeyDecisionBase(BaseModel):
#     title: str
#     sequence: str  # Two digits string, e.g., "01", "02"
#     description: Optional[str] = None
#     document_url: Optional[str] = None

# class KeyDecisionCreate(KeyDecisionBase):
#     pass

# class KeyDecisionResponse(KeyDecisionBase):
#     id: str = Field(alias="_id")
#     project_id: str
    
#     model_config = ConfigDict(
#         populate_by_name=True
#     )

# # Knowledge Gap models for future reference
# class KnowledgeGapBase(BaseModel):
#     title: str
#     sequence: str  # Two digits string, e.g., "01", "02"
#     description: Optional[str] = None
#     document_url: Optional[str] = None

# class KnowledgeGapCreate(KnowledgeGapBase):
#     pass

# class KnowledgeGapResponse(KnowledgeGapBase):
#     id: str = Field(alias="_id")
#     key_decision_id: str
    
#     model_config = ConfigDict(
#         populate_by_name=True
#     )

#### PHASE 3.3 ####
"""
Archive Models - Updated with tenant isolation (Sub-Phase 3.3).
Added tenant_id field to all models for complete tenant isolation.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from bson import ObjectId
from datetime import datetime

# Helper function to convert MongoDB ObjectId to string
def convert_object_id(obj: dict) -> dict:
    """Convert MongoDB ObjectId to string in a dictionary."""
    if obj and "_id" in obj and isinstance(obj["_id"], ObjectId):
        obj["_id"] = str(obj["_id"])
    return obj

# Enhanced Document model for tenant isolation
class DocumentModel(BaseModel):
    filename: str
    stored_filename: str
    s3_key: str  # NEW: S3 key instead of local path
    s3_bucket: str  # NEW: Tenant's S3 bucket
    aws_account_id: str  # NEW: For cross-account access
    tenant_id: str  # NEW: Tenant isolation
    uploaded_at: str  # ISO format datetime
    file_size: Optional[int] = None  # NEW: File size in bytes
    file_type: Optional[str] = None  # NEW: File extension
    kb_indexed: Optional[bool] = False  # NEW: Knowledge Base indexing status

# Enhanced Project models with tenant isolation
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    documents: Optional[List[DocumentModel]] = []
    tenant_id: Optional[str] = None  # NEW: Tenant isolation

class ProjectCreate(ProjectBase):
    # tenant_id will be set by the service, not by the client
    tenant_id: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str = Field(alias="_id")
    tenant_id: str  # REQUIRED in response to ensure isolation
    created_at: Optional[datetime] = None  # NEW: Creation timestamp
    updated_at: Optional[datetime] = None  # NEW: Update timestamp
    
    model_config = ConfigDict(
        populate_by_name=True
    )

# Enhanced search result model
class ArchiveSearchResult(BaseModel):
    rank: int
    score: float
    content: str
    metadata: dict
    document_id: Optional[str] = None
    tenant_id: str  # NEW: Ensure all results are tenant-scoped

# Archive status model
class ArchiveStatusResponse(BaseModel):
    tenant_name: str
    knowledge_base_id: Optional[str] = None
    kb_status: Optional[str] = None
    s3_bucket: Optional[str] = None
    project_count: int
    document_count: int
    isolated: bool = True
    archive_type: str = "knowledge_base"

# Key Decision models (updated with tenant isolation)
class KeyDecisionBase(BaseModel):
    title: str
    sequence: str  # Two digits string, e.g., "01", "02"
    description: Optional[str] = None
    document_url: Optional[str] = None
    tenant_id: Optional[str] = None  # NEW: Tenant isolation

class KeyDecisionCreate(KeyDecisionBase):
    tenant_id: Optional[str] = None

class KeyDecisionResponse(KeyDecisionBase):
    id: str = Field(alias="_id")
    project_id: str
    tenant_id: str  # REQUIRED in response
    
    model_config = ConfigDict(
        populate_by_name=True
    )

# Knowledge Gap models (updated with tenant isolation)
class KnowledgeGapBase(BaseModel):
    title: str
    sequence: str  # Two digits string, e.g., "01", "02"
    description: Optional[str] = None
    document_url: Optional[str] = None
    tenant_id: Optional[str] = None  # NEW: Tenant isolation

class KnowledgeGapCreate(KnowledgeGapBase):
    tenant_id: Optional[str] = None

class KnowledgeGapResponse(KnowledgeGapBase):
    id: str = Field(alias="_id")
    key_decision_id: str
    tenant_id: str  # REQUIRED in response
    
    model_config = ConfigDict(
        populate_by_name=True
    )