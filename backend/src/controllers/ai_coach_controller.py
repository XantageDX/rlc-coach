# ai_coach_controller.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from src.services.ai_coach_service import ask_ai_coach
from src.utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class AICoachQuestion(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    model_id: Optional[str] = None

class AICoachResponse(BaseModel):
    answer: str
    conversation_id: str

@router.post("/ask", response_model=AICoachResponse)
async def ask_question(
    data: AICoachQuestion,
    current_user = Depends(get_current_user)
):
    """
    Ask a question to the AI Coach about RLC methodology.
    """
    response = await ask_ai_coach(data.question, data.conversation_id, data.model_id)
    
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"])
    
    return response