# backend/src/models/archive_models.py
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

# Document model for uploaded files
class DocumentModel(BaseModel):
    filename: str
    stored_filename: str
    path: str
    uploaded_at: str  # ISO format datetime

# Project models
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    documents: Optional[List[DocumentModel]] = []

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str = Field(alias="_id")
    
    model_config = ConfigDict(
        populate_by_name=True
    )

# Key Decision models for future reference
class KeyDecisionBase(BaseModel):
    title: str
    sequence: str  # Two digits string, e.g., "01", "02"
    description: Optional[str] = None
    document_url: Optional[str] = None

class KeyDecisionCreate(KeyDecisionBase):
    pass

class KeyDecisionResponse(KeyDecisionBase):
    id: str = Field(alias="_id")
    project_id: str
    
    model_config = ConfigDict(
        populate_by_name=True
    )

# Knowledge Gap models for future reference
class KnowledgeGapBase(BaseModel):
    title: str
    sequence: str  # Two digits string, e.g., "01", "02"
    description: Optional[str] = None
    document_url: Optional[str] = None

class KnowledgeGapCreate(KnowledgeGapBase):
    pass

class KnowledgeGapResponse(KnowledgeGapBase):
    id: str = Field(alias="_id")
    key_decision_id: str
    
    model_config = ConfigDict(
        populate_by_name=True
    )