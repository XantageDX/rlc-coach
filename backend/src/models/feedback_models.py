from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class FeedbackCreate(BaseModel):
    component: str  # "AICoach" or "ReportWriter"
    modelId: str
    conversationId: str
    userInput: Optional[str] = None
    aiOutput: str
    ragPrompt: Optional[str] = None  # This will be populated on the backend
    rating: str  # "positive" or "negative"
    feedbackText: Optional[str] = None

class FeedbackInDB(FeedbackCreate):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    userEmail: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class FeedbackResponse(BaseModel):
    success: bool
    message: str