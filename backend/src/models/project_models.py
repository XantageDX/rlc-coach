from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    tenant_id: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectInDB(ProjectBase):
    id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    status: str = "active"
    managers: List[str] = []
    users: List[str] = []


class ProjectResponse(ProjectBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    status: str
    managers: List[str]
    users: List[str]
