from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class IntegrationEventBase(BaseModel):
    name: str
    description: Optional[str] = None
    date: Optional[datetime] = None


class IntegrationEventCreate(IntegrationEventBase):
    pass


class IntegrationEventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = None


class IntegrationEventInDB(IntegrationEventBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    status: str = "planned"
    position: int = 0  # For ordering in the board view


class IntegrationEventResponse(IntegrationEventBase):
    id: str
    project_id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    status: str
    position: int