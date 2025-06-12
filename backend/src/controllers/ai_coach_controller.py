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

# #### TENANTS ####
# # ai_coach_controller.py
# from fastapi import APIRouter, Depends, HTTPException, Body
# from typing import Optional
# from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory
# from src.utils.auth import get_current_user
# from src.utils.quota_decorator import log_tokens_manually
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
#     Ask a question to the AI Coach about RLC methodology with quota enforcement.
#     """
#     # Check quota before making LLM call (only for tenant users)
#     if current_user.tenant_id:
#         from src.services.tenant_quota_service import quota_manager
        
#         # Estimate tokens (rough estimate for quota check)
#         estimated_tokens = len(data.question) * 2  # Rough estimate: question + response
        
#         quota_check = await quota_manager.check_token_quota(current_user.tenant_id, estimated_tokens)
        
#         if not quota_check["allowed"]:
#             raise HTTPException(
#                 status_code=429,
#                 detail={
#                     "error": "Token quota exceeded",
#                     "message": quota_check["message"],
#                     "current_usage": quota_check["current_usage"],
#                     "limit": quota_check["limit"]
#                 }
#             )
    
#     # Make the LLM call
#     response = await ask_ai_coach(data.question, data.conversation_id, data.model_id)
    
#     if "error" in response:
#         raise HTTPException(status_code=500, detail=response["error"])
    
#     # Log actual token usage (if tenant user)
#     if current_user.tenant_id and isinstance(response, dict):
#         # Calculate actual tokens used (rough estimate based on response length)
#         actual_tokens = len(response.get("answer", "")) + len(data.question)
        
#         await log_tokens_manually(
#             tenant_id=current_user.tenant_id,
#             user_email=current_user.username,
#             api_endpoint="/ai-coach/ask",
#             token_type="llm",
#             tokens_used=actual_tokens,
#             model=data.model_id or "default"
#         )
        
#         # Add quota warning if needed
#         if current_user.tenant_id:
#             quota_check = await quota_manager.check_token_quota(current_user.tenant_id, 0)
#             if quota_check["warning"]:
#                 response["quota_warning"] = quota_check["message"]
    
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

# Complete rewrite of ai_coach_controller.py for Phase 2
# Location: backend/src/controllers/ai_coach_controller.py

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory
from src.utils.auth import get_current_user
from src.services.token_usage_service import token_logger
from src.config.model_constants import LLM_MODEL
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class AICoachQuestion(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    # model_id removed - we now force standardized model

class AICoachResponse(BaseModel):
    answer: str
    conversation_id: str
    model_used: str  # Always shows the standardized model
    token_info: Optional[dict] = None  # Token usage info

class ClearConversationRequest(BaseModel):
    conversation_id: str

@router.post("/ask", response_model=AICoachResponse)
async def ask_question(
    data: AICoachQuestion,
    current_user = Depends(get_current_user)
):
    """
    Ask a question to the AI Coach about RLC methodology with standardized Llama 3.3 model
    Enhanced with accurate token tracking and quota enforcement
    """
    
    # Check quota before processing (only for tenant users)
    if current_user.tenant_id:
        from src.services.tenant_quota_service import quota_manager
        
        # Use improved token estimation for quota check
        estimated_tokens = token_logger.estimate_tokens(data.question) * 2  # Question + expected response
        
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
    
    try:
        # Force standardized model - ignore any model preferences
        standardized_model = LLM_MODEL  # Always use Llama 3.3 70B
        
        # Get AI Coach response with standardized model and tenant isolation
        response = await ask_ai_coach(
            question=data.question,
            conversation_id=data.conversation_id,
            model_id=standardized_model,  # Force standardization
            tenant_id=current_user.tenant_id  # For conversation isolation (Phase 5 prep)
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        # Enhanced token logging for tenant users with accurate counting
        token_info = None
        if current_user.tenant_id:
            # Use enhanced logging method with precise token counting
            token_info = await token_logger.log_llm_usage_from_texts(
                tenant_id=current_user.tenant_id,
                user_email=current_user.username,
                endpoint="/ai-coach/ask",
                input_text=data.question,
                output_text=response.get("answer", ""),
                model=standardized_model
            )
            
            # Check for quota warning after logging actual usage
            quota_check = await quota_manager.check_token_quota(current_user.tenant_id, 0)
            if quota_check.get("warning"):
                # Add warning to response if approaching limit
                if "quota_warning" not in response:
                    response["quota_warning"] = quota_check["message"]
        
        # Return enhanced response with standardized model info
        return AICoachResponse(
            answer=response["answer"],
            conversation_id=response.get("conversation_id", data.conversation_id or "default"),
            model_used=standardized_model,  # Always show Llama 3.3
            token_info=token_info  # Include token usage for debugging/transparency
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing AI Coach request: {str(e)}"
        )

@router.post("/clear")
async def clear_conversation(
    data: ClearConversationRequest,
    current_user = Depends(get_current_user)
):
    """
    Clear the conversation memory for a specific conversation ID
    Enhanced with tenant isolation support
    """
    try:
        # Clear conversation with tenant isolation (Phase 5 prep)
        clear_conversation_memory(
            conversation_id=data.conversation_id,
            tenant_id=current_user.tenant_id  # Prepare for tenant isolation
        )
        
        return {
            "message": "Conversation memory cleared successfully",
            "conversation_id": data.conversation_id,
            "tenant_id": current_user.tenant_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error clearing conversation: {str(e)}"
        )

@router.get("/models")
async def get_available_models(current_user = Depends(get_current_user)):
    """
    Get available AI models (Phase 2: Returns only standardized model)
    This endpoint now returns only Llama 3.3 to simplify the user experience
    """
    return {
        "available_models": [
            {
                "id": LLM_MODEL,
                "name": "Llama 3.3 70B (Standardized)",
                "description": "High-quality standardized model for all AI Coach operations",
                "standardized": True,
                "cost_efficient": True
            }
        ],
        "default_model": LLM_MODEL,
        "message": "Model selection has been simplified. All requests now use the optimized Llama 3.3 70B model."
    }

@router.get("/conversation/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get conversation history for a specific conversation
    Enhanced with tenant isolation support
    """
    try:
        from src.services.ai_coach_service import get_conversation_history
        
        # Get conversation history with tenant isolation
        history = get_conversation_history(
            conversation_id=conversation_id,
            tenant_id=current_user.tenant_id  # Tenant isolation
        )
        
        return {
            "conversation_id": conversation_id,
            "tenant_id": current_user.tenant_id,
            "history": history,
            "message_count": len(history) if history else 0
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving conversation history: {str(e)}"
        )

@router.get("/usage/current")
async def get_current_usage(current_user = Depends(get_current_user)):
    """
    Get current token usage for the authenticated user's tenant
    Shows LLM vs Embedding token breakdown
    """
    if not current_user.tenant_id:
        return {
            "message": "Super admin users have unlimited token usage",
            "tenant_id": None
        }
    
    try:
        # Get current month usage summary
        usage_summary = await token_logger.get_tenant_usage_summary(current_user.tenant_id)
        
        # Get enhanced monthly breakdown (Phase 2)
        from src.utils.db import db
        monthly_collection = db["monthly_token_usage"]
        current_month = datetime.utcnow().strftime("%Y-%m")
        
        enhanced_usage = monthly_collection.find_one({
            "tenant_id": current_user.tenant_id,
            "month": current_month
        })
        
        if enhanced_usage:
            usage_summary["enhanced_breakdown"] = {
                "llm_tokens": enhanced_usage.get("total_llm_tokens", 0),
                "embedding_tokens": enhanced_usage.get("total_embedding_tokens", 0),
                "other_tokens": enhanced_usage.get("total_other_tokens", 0),
                "total_tokens": enhanced_usage.get("total_tokens", 0),
                "month": current_month
            }
        
        return usage_summary
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving usage information: {str(e)}"
        )