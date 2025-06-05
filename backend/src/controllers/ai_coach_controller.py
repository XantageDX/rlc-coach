# # ai_coach_controller.py
# from fastapi import APIRouter, Depends, HTTPException, Body
# from typing import Optional
# from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory
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

# class ClearConversationRequest(BaseModel):
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

# @router.post("/clear")
# async def clear_conversation(
#     data: ClearConversationRequest,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Clear the conversation memory for a specific conversation ID.
#     """
#     try:
#         clear_conversation_memory(data.conversation_id)
#         return {"message": "Conversation memory cleared successfully"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error clearing conversation: {str(e)}")

#### TENANTS ####
# ai_coach_controller.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory
from src.utils.auth import get_current_user
from src.utils.quota_decorator import log_tokens_manually
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
    Ask a question to the AI Coach about RLC methodology with quota enforcement.
    """
    # Check quota before making LLM call (only for tenant users)
    if current_user.tenant_id:
        from src.services.tenant_quota_service import quota_manager
        
        # Estimate tokens (rough estimate for quota check)
        estimated_tokens = len(data.question) * 2  # Rough estimate: question + response
        
        quota_check = await quota_manager.check_token_quota(current_user.tenant_id, estimated_tokens)
        
        if not quota_check["allowed"]:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Token quota exceeded",
                    "message": quota_check["message"],
                    "current_usage": quota_check["current_usage"],
                    "limit": quota_check["limit"]
                }
            )
    
    # Make the LLM call
    response = await ask_ai_coach(data.question, data.conversation_id, data.model_id)
    
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"])
    
    # Log actual token usage (if tenant user)
    if current_user.tenant_id and isinstance(response, dict):
        # Calculate actual tokens used (rough estimate based on response length)
        actual_tokens = len(response.get("answer", "")) + len(data.question)
        
        await log_tokens_manually(
            tenant_id=current_user.tenant_id,
            user_email=current_user.username,
            api_endpoint="/ai-coach/ask",
            token_type="llm",
            tokens_used=actual_tokens,
            model=data.model_id or "default"
        )
        
        # Add quota warning if needed
        if current_user.tenant_id:
            quota_check = await quota_manager.check_token_quota(current_user.tenant_id, 0)
            if quota_check["warning"]:
                response["quota_warning"] = quota_check["message"]
    
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