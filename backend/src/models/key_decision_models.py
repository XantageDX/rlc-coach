from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class KeyDecisionBase(BaseModel):
    title: str
    description: Optional[str] = None  # Renamed to key_decision_text in response
    integration_event_id: str
    owner: Optional[str] = None
    decision_maker: Optional[str] = None
    sequence: Optional[str] = None  # "01", "02", etc.
    purpose: Optional[str] = None
    what_we_have_done: Optional[str] = None
    what_we_have_learned: Optional[str] = None
    recommendations: Optional[str] = None  # What We Recommend/What We Have Decided


class KeyDecisionCreate(KeyDecisionBase):
    pass


class KeyDecisionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None  # Renamed to key_decision_text in response
    integration_event_id: Optional[str] = None
    owner: Optional[str] = None
    decision_maker: Optional[str] = None
    sequence: Optional[str] = None
    purpose: Optional[str] = None
    what_we_have_done: Optional[str] = None
    what_we_have_learned: Optional[str] = None
    recommendations: Optional[str] = None
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
    
    # This property maps 'description' to 'key_decision_text' for the frontend
    @property
    def key_decision_text(self) -> Optional[str]:
        return self.description