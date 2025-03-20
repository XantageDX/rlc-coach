# backend/src/models/archive_models.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from bson import ObjectId

# Helper function to convert MongoDB ObjectId to string
def convert_object_id(obj: dict) -> dict:
    """Convert MongoDB ObjectId to string in a dictionary."""
    if obj and "_id" in obj and isinstance(obj["_id"], ObjectId):
        obj["_id"] = str(obj["_id"])
    return obj

# Project models
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    collaborators: List[str] = []  # List of user IDs who have access

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str = Field(alias="_id")
    
    model_config = ConfigDict(
        populate_by_name=True
    )

# Key Decision models
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

# Knowledge Gap models
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