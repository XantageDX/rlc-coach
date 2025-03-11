from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class KeyDecisionBase(BaseModel):
    title: str
    description: Optional[str] = None
    integration_event_id: str
    owner: Optional[str] = None
    decision_maker: Optional[str] = None


class KeyDecisionCreate(KeyDecisionBase):
    pass


class KeyDecisionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    integration_event_id: Optional[str] = None
    owner: Optional[str] = None
    decision_maker: Optional[str] = None
    status: Optional[str] = None


class KeyDecisionInDB(KeyDecisionBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    status: str = "draft"
    knowledge_gaps: List[str] = []


class KeyDecisionResponse(KeyDecisionBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    status: str
    knowledge_gaps: List[str]