from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class KnowledgeGapBase(BaseModel):
    title: str
    description: Optional[str] = None  # Will be mapped to 'question' in frontend
    key_decision_id: str
    owner: Optional[str] = None
    contributors: Optional[List[str]] = []
    learning_cycle: Optional[str] = None
    sequence: Optional[str] = None  # "01", "02", etc. (within its KD)
    kd_sequence: Optional[str] = None  # The sequence of its parent KD
    purpose: Optional[str] = None
    what_we_have_done: Optional[str] = None
    what_we_have_learned: Optional[str] = None
    recommendations: Optional[str] = None  # Recommendations And Next Steps


class KnowledgeGapCreate(KnowledgeGapBase):
    pass


class KnowledgeGapUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None  # Will be mapped to 'question' in frontend
    key_decision_id: Optional[str] = None
    owner: Optional[str] = None
    contributors: Optional[List[str]] = None
    learning_cycle: Optional[str] = None
    sequence: Optional[str] = None
    kd_sequence: Optional[str] = None
    purpose: Optional[str] = None
    what_we_have_done: Optional[str] = None
    what_we_have_learned: Optional[str] = None
    recommendations: Optional[str] = None
    status: Optional[str] = None


class KnowledgeGapInDB(KnowledgeGapBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    status: str = "in_progress"


class KnowledgeGapResponse(KnowledgeGapBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    status: str
    
    # This property maps 'description' to 'question' for the frontend
    @property
    def question(self) -> Optional[str]:
        return self.description