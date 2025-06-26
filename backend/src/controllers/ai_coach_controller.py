# Complete rewrite of ai_coach_controller.py for Phase 2
# Location: backend/src/controllers/ai_coach_controller.py

# from fastapi import APIRouter, Depends, HTTPException, Body
# from typing import Optional
# from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory
# from src.utils.auth import get_current_user
# from src.services.token_usage_service import token_logger
# from src.config.model_constants import LLM_MODEL
# from pydantic import BaseModel
# from datetime import datetime

# router = APIRouter()

# class AICoachQuestion(BaseModel):
#     question: str
#     conversation_id: Optional[str] = None
#     # model_id removed - we now force standardized model

# class AICoachResponse(BaseModel):
#     answer: str
#     conversation_id: str
#     model_used: str  # Always shows the standardized model
#     token_info: Optional[dict] = None  # Token usage info

# class ClearConversationRequest(BaseModel):
#     conversation_id: str

# @router.post("/ask", response_model=AICoachResponse)
# async def ask_question(
#     data: AICoachQuestion,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Ask a question to the AI Coach about RLC methodology with standardized Llama 3.3 model
#     Enhanced with accurate token tracking and quota enforcement
#     """
    
#     # Check quota before processing (only for tenant users)
#     if current_user.tenant_id:
#         from src.services.tenant_quota_service import quota_manager
        
#         # Use improved token estimation for quota check
#         estimated_tokens = token_logger.estimate_tokens(data.question) * 2  # Question + expected response
        
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
    
#     try:
#         # Force standardized model - ignore any model preferences
#         standardized_model = LLM_MODEL  # Always use Llama 3.3 70B
        
#         # Get AI Coach response with standardized model and tenant isolation
#         response = await ask_ai_coach(
#             question=data.question,
#             conversation_id=data.conversation_id,
#             model_id=standardized_model,  # Force standardization
#             tenant_id=current_user.tenant_id  # For conversation isolation (Phase 5 prep)
#         )
        
#         if "error" in response:
#             raise HTTPException(status_code=500, detail=response["error"])
        
#         # Enhanced token logging for tenant users with accurate counting
#         token_info = None
#         if current_user.tenant_id:
#             # Use enhanced logging method with precise token counting
#             token_info = await token_logger.log_llm_usage_from_texts(
#                 tenant_id=current_user.tenant_id,
#                 user_email=current_user.username,
#                 endpoint="/ai-coach/ask",
#                 input_text=data.question,
#                 output_text=response.get("answer", ""),
#                 model=standardized_model
#             )
            
#             # Check for quota warning after logging actual usage
#             quota_check = await quota_manager.check_token_quota(current_user.tenant_id, 0)
#             if quota_check.get("warning"):
#                 # Add warning to response if approaching limit
#                 if "quota_warning" not in response:
#                     response["quota_warning"] = quota_check["message"]
        
#         # Return enhanced response with standardized model info
#         return AICoachResponse(
#             answer=response["answer"],
#             conversation_id=response.get("conversation_id", data.conversation_id or "default"),
#             model_used=standardized_model,  # Always show Llama 3.3
#             token_info=token_info  # Include token usage for debugging/transparency
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, 
#             detail=f"Error processing AI Coach request: {str(e)}"
#         )

# @router.post("/clear")
# async def clear_conversation(
#     data: ClearConversationRequest,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Clear the conversation memory for a specific conversation ID
#     Enhanced with tenant isolation support
#     """
#     try:
#         # Clear conversation with tenant isolation (Phase 5 prep)
#         clear_conversation_memory(
#             conversation_id=data.conversation_id,
#             tenant_id=current_user.tenant_id  # Prepare for tenant isolation
#         )
        
#         return {
#             "message": "Conversation memory cleared successfully",
#             "conversation_id": data.conversation_id,
#             "tenant_id": current_user.tenant_id
#         }
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, 
#             detail=f"Error clearing conversation: {str(e)}"
#         )

# @router.get("/models")
# async def get_available_models(current_user = Depends(get_current_user)):
#     """
#     Get available AI models (Phase 2: Returns only standardized model)
#     This endpoint now returns only Llama 3.3 to simplify the user experience
#     """
#     return {
#         "available_models": [
#             {
#                 "id": LLM_MODEL,
#                 "name": "Llama 3.3 70B (Standardized)",
#                 "description": "High-quality standardized model for all AI Coach operations",
#                 "standardized": True,
#                 "cost_efficient": True
#             }
#         ],
#         "default_model": LLM_MODEL,
#         "message": "Model selection has been simplified. All requests now use the optimized Llama 3.3 70B model."
#     }

# @router.get("/conversation/{conversation_id}/history")
# async def get_conversation_history(
#     conversation_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Get conversation history for a specific conversation
#     Enhanced with tenant isolation support
#     """
#     try:
#         from src.services.ai_coach_service import get_conversation_history
        
#         # Get conversation history with tenant isolation
#         history = get_conversation_history(
#             conversation_id=conversation_id,
#             tenant_id=current_user.tenant_id  # Tenant isolation
#         )
        
#         return {
#             "conversation_id": conversation_id,
#             "tenant_id": current_user.tenant_id,
#             "history": history,
#             "message_count": len(history) if history else 0
#         }
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error retrieving conversation history: {str(e)}"
#         )

# @router.get("/usage/current")
# async def get_current_usage(current_user = Depends(get_current_user)):
#     """
#     Get current token usage for the authenticated user's tenant
#     Shows LLM vs Embedding token breakdown
#     """
#     if not current_user.tenant_id:
#         return {
#             "message": "Super admin users have unlimited token usage",
#             "tenant_id": None
#         }
    
#     try:
#         # Get current month usage summary
#         usage_summary = await token_logger.get_tenant_usage_summary(current_user.tenant_id)
        
#         # Get enhanced monthly breakdown (Phase 2)
#         from src.utils.db import db
#         monthly_collection = db["monthly_token_usage"]
#         current_month = datetime.utcnow().strftime("%Y-%m")
        
#         enhanced_usage = monthly_collection.find_one({
#             "tenant_id": current_user.tenant_id,
#             "month": current_month
#         })
        
#         if enhanced_usage:
#             usage_summary["enhanced_breakdown"] = {
#                 "llm_tokens": enhanced_usage.get("total_llm_tokens", 0),
#                 "embedding_tokens": enhanced_usage.get("total_embedding_tokens", 0),
#                 "other_tokens": enhanced_usage.get("total_other_tokens", 0),
#                 "total_tokens": enhanced_usage.get("total_tokens", 0),
#                 "month": current_month
#             }
        
#         return usage_summary
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error retrieving usage information: {str(e)}"
#         )

#### PHASE 5.1 ####
from fastapi import APIRouter, Depends, HTTPException, Body, status
from typing import Optional
from src.services.ai_coach_service import ask_ai_coach, clear_conversation_memory, get_active_conversations
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
    PHASE 5.1: Enhanced with ENFORCED tenant isolation
    """
    
    # PHASE 5.1 SECURITY ENFORCEMENT: Validate tenant assignment
    user_tenant_id = current_user.tenant_id
    
    # For non-super admin users, tenant_id is MANDATORY
    if current_user.role != "super_admin" and not user_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Tenant assignment required",
                "message": "AI Coach access requires tenant assignment. Please contact your administrator.",
                "user_role": current_user.role,
                "isolation_enforced": True
            }
        )
    
    # Check quota before processing (only for tenant users)
    if user_tenant_id:
        from src.services.tenant_quota_service import quota_manager
        
        # Use improved token estimation for quota check
        estimated_tokens = token_logger.estimate_tokens(data.question) * 2  # Question + expected response
        
        quota_check = await quota_manager.check_token_quota(user_tenant_id, estimated_tokens)
        
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
        
        # PHASE 5.1 AUDIT: Log the AI Coach request for security monitoring
        if user_tenant_id:
            print(f"🔒 AI Coach request from tenant {user_tenant_id}: {data.conversation_id}")
        else:
            #print(f"🔓 AI Coach request from super admin: {current_user.email}")
            print(f"🔓 AI Coach request from super admin: {current_user.username}")
        
        # # Get AI Coach response with standardized model and ENFORCED tenant isolation
        # response = await ask_ai_coach(
        #     question=data.question,
        #     conversation_id=data.conversation_id,
        #     model_id=standardized_model,  # Force standardization
        #     tenant_id=user_tenant_id  # ENFORCED: Pass tenant_id for isolation
        # )
        # Get AI Coach response with standardized model and ENFORCED tenant+user isolation
        response = await ask_ai_coach(
            question=data.question,
            conversation_id=data.conversation_id,
            model_id=standardized_model,  # Force standardization
            tenant_id=user_tenant_id,  # ENFORCED: Pass tenant_id for isolation
            user_email=current_user.username  # ENFORCED: Pass user_email for complete isolation
        )
        
        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])
        
        # Enhanced token logging for tenant users with accurate counting
        token_info = None
        if user_tenant_id:
            # Use enhanced logging method with precise token counting
            token_info = await token_logger.log_llm_usage_from_texts(
                tenant_id=user_tenant_id,
                user_email=current_user.username,
                endpoint="/ai-coach/ask",
                input_text=data.question,
                output_text=response.get("answer", ""),
                model=standardized_model
            )
            
            # Check for quota warning after logging actual usage
            quota_check = await quota_manager.check_token_quota(user_tenant_id, 0)
            if quota_check.get("warning"):
                # Add warning to response if approaching limit
                if "quota_warning" not in response:
                    response["quota_warning"] = quota_check["message"]
        
        # PHASE 5.1: Enhanced token_info with isolation confirmation
        # if token_info:
        #     token_info["isolation_confirmed"] = user_tenant_id is not None
        #     token_info["tenant_id"] = user_tenant_id
        
        # # Return enhanced response with standardized model info
        # return AICoachResponse(
        #     answer=response["answer"],
        #     conversation_id=response.get("conversation_id", data.conversation_id or "default"),
        #     model_used=standardized_model,  # Always show Llama 3.3
        #     token_info=token_info  # Include token usage for debugging/transparency
        # )
        # PHASE 5.1: Enhanced token_info with isolation confirmation
        if token_info:
            token_info["isolation_confirmed"] = user_tenant_id is not None
            token_info["tenant_id"] = user_tenant_id
            
            # 🔧 FIX: Convert any ObjectId fields to strings in token_info
            for key, value in token_info.items():
                if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
                    token_info[key] = str(value)

        # Return enhanced response with standardized model info
        return AICoachResponse(
            answer=response["answer"],
            conversation_id=response.get("conversation_id", data.conversation_id or "default"),
            model_used=standardized_model,
            token_info=token_info  # 🎯 Now clean of ObjectIds
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
    PHASE 5.1: Enhanced with ENFORCED tenant isolation
    """
    try:
        user_tenant_id = current_user.tenant_id
        
        # PHASE 5.1 SECURITY ENFORCEMENT: Validate tenant assignment for non-super admin
        if current_user.role != "super_admin" and not user_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Tenant assignment required",
                    "message": "Conversation management requires tenant assignment.",
                    "operation": "clear_conversation"
                }
            )
        
        # # PHASE 5.1 AUDIT: Log the clear operation
        # if user_tenant_id:
        #     print(f"🔒 Clearing conversation for tenant {user_tenant_id}: {data.conversation_id}")
        # else:
        #     print(f"🔓 Super admin clearing conversation: {data.conversation_id}")
        # PHASE 5.1 AUDIT: Log conversation clearing for security monitoring with user isolation
        if user_tenant_id:
            print(f"🗑️ Clearing conversation {data.conversation_id} for tenant {user_tenant_id}, user {current_user.username}")
        else:
            print(f"🗑️ Clearing global conversation {data.conversation_id} by super admin: {current_user.username}")
        
        # # Clear conversation with ENFORCED tenant isolation
        # success = clear_conversation_memory(
        #     conversation_id=data.conversation_id,
        #     tenant_id=user_tenant_id  # ENFORCED: Pass tenant_id for isolation
        # )
        # Clear conversation memory with tenant+user scoping for complete isolation
        success = clear_conversation_memory(
            conversation_id=data.conversation_id,
            tenant_id=user_tenant_id,
            user_email=current_user.username  # Add user-level isolation
        )
        
        return {
            "message": "Conversation memory cleared successfully" if success else "No conversation found to clear",
            "conversation_id": data.conversation_id,
            "tenant_id": user_tenant_id,
            "isolation_confirmed": user_tenant_id is not None,
            "success": success
        }
        
    except HTTPException:
        raise
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
    PHASE 5.1: Enhanced with isolation information
    """
    user_tenant_id = current_user.tenant_id
    
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
        "message": "Model selection has been simplified. All requests now use the optimized Llama 3.3 70B model.",
        "isolation_info": {
            "tenant_id": user_tenant_id,
            "isolation_enforced": True,
            "conversations_scoped": user_tenant_id is not None,
            "user_role": current_user.role
        }
    }

@router.get("/conversation/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get conversation history for a specific conversation
    Enhanced with tenant isolation support
    PHASE 5.1: Enhanced with ENFORCED tenant isolation
    """
    try:
        user_tenant_id = current_user.tenant_id
        
        # PHASE 5.1 SECURITY ENFORCEMENT: Validate tenant assignment for non-super admin
        if current_user.role != "super_admin" and not user_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Tenant assignment required",
                    "message": "Conversation history access requires tenant assignment."
                }
            )
        
        from src.services.ai_coach_service import get_conversation_history
        
        # Get conversation history with ENFORCED tenant isolation
        history = get_conversation_history(
            conversation_id=conversation_id,
            tenant_id=user_tenant_id  # ENFORCED: Pass tenant_id for isolation
        )
        
        return {
            "conversation_id": conversation_id,
            "tenant_id": user_tenant_id,
            "history": history,
            "message_count": len(history) if history else 0,
            "isolation_confirmed": user_tenant_id is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving conversation history: {str(e)}"
        )

@router.get("/conversations")
async def get_active_conversations_endpoint(current_user = Depends(get_current_user)):
    """
    NEW: Get list of active conversations with ENFORCED tenant isolation.
    Phase 5.1: Users can only see their own conversations.
    """
    try:
        user_tenant_id = current_user.tenant_id
        
        # PHASE 5.1 SECURITY ENFORCEMENT: Validate tenant assignment for non-super admin
        if current_user.role != "super_admin" and not user_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Tenant assignment required",
                    "message": "Conversation listing requires tenant assignment."
                }
            )
        
        # Get conversations with enforced tenant isolation
        conversations = get_active_conversations(requesting_tenant_id=user_tenant_id)
        
        # Add user context
        conversations["user_info"] = {
            #"user_email": current_user.email,
            "user_email": current_user.username,
            "user_role": current_user.role,
            "tenant_id": user_tenant_id,
            "isolation_enforced": True
        }
        
        print(f"📋 Conversation list provided to tenant {user_tenant_id}: {conversations['total_chains']} conversations")
        return conversations
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving conversations: {str(e)}"
        )

@router.get("/usage/current")
async def get_current_usage(current_user = Depends(get_current_user)):
    """
    Get current token usage for the authenticated user's tenant
    Shows LLM vs Embedding token breakdown
    PHASE 5.1: Enhanced with tenant validation
    """
    user_tenant_id = current_user.tenant_id
    
    if not user_tenant_id:
        return {
            "message": "Super admin users have unlimited token usage",
            "tenant_id": None,
            "user_role": current_user.role,
            "isolation_level": "global"
        }
    
    try:
        # Get current month usage summary
        usage_summary = await token_logger.get_tenant_usage_summary(user_tenant_id)
        
        # Get enhanced monthly breakdown (Phase 2)
        from src.utils.db import db
        monthly_collection = db["monthly_token_usage"]
        current_month = datetime.utcnow().strftime("%Y-%m")
        
        enhanced_usage = monthly_collection.find_one({
            "tenant_id": user_tenant_id,
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
        
        # PHASE 5.1: Add isolation confirmation
        usage_summary["isolation_info"] = {
            "tenant_id": user_tenant_id,
            "isolation_confirmed": True,
            "user_role": current_user.role
        }
        
        return usage_summary
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving usage information: {str(e)}"
        )