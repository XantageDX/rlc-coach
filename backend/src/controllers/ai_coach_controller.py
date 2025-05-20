# # ai_coach_controller.py
# from fastapi import APIRouter, Depends, HTTPException, Body
# from typing import Optional
# from src.services.ai_coach_service import ask_ai_coach
# from src.utils.auth import get_current_user
# from pydantic import BaseModel

# router = APIRouter()

# class AICoachQuestion(BaseModel):
#     question: str
#     conversation_id: Optional[str] = None
#     model_id: Optional[str] = None

# class AICoachResponse(BaseModel):
#     answer: str
#     conversation_id: str

# @router.post("/ask", response_model=AICoachResponse)
# async def ask_question(
#     data: AICoachQuestion,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Ask a question to the AI Coach about RLC methodology.
#     """
#     response = await ask_ai_coach(data.question, data.conversation_id, data.model_id)
    
#     if "error" in response:
#         raise HTTPException(status_code=500, detail=response["error"])
    
#     return response

### CLEAR CONVERSATION MEMORY ###

# ai_coach_controller.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory
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

class ClearConversationRequest(BaseModel):
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

@router.post("/clear")
async def clear_conversation(
    data: ClearConversationRequest,
    current_user = Depends(get_current_user)
):
    """
    Clear the conversation memory for a specific conversation ID.
    """
    try:
        clear_conversation_memory(data.conversation_id)
        return {"message": "Conversation memory cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing conversation: {str(e)}")