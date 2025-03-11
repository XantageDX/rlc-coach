from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class KnowledgeGapBase(BaseModel):
    title: str
    description: Optional[str] = None
    key_decision_id: str
    owner: Optional[str] = None
    contributors: Optional[List[str]] = []
    learning_cycle: Optional[str] = None


class KnowledgeGapCreate(KnowledgeGapBase):
    pass


class KnowledgeGapUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    key_decision_id: Optional[str] = None
    owner: Optional[str] = None
    contributors: Optional[List[str]] = None
    learning_cycle: Optional[str] = None
    status: Optional[str] = None


class KnowledgeGapInDB(KnowledgeGapBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    status: str = "in_progress"
    recommendations: Optional[str] = None
    learned: Optional[str] = None


class KnowledgeGapResponse(KnowledgeGapBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    status: str
    recommendations: Optional[str]
    learned: Optional[str]