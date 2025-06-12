# from fastapi import APIRouter, Depends, Body, HTTPException, status
# from src.utils.auth import get_current_user
# from src.services.report_ai_service import process_kg_message, evaluate_kg_report, process_kd_message, evaluate_kd_report
# from src.services.archive_service import search_archive, get_all_projects
# from src.ai_coach.bedrock_llm import get_bedrock_llm
# from pydantic import BaseModel
# from typing import Optional, Dict, Any

# router = APIRouter()

# ### CLEAR CONVERSATION MEMORY
# class ReportMessageRequest(BaseModel):
#     message: str
#     report_id: Optional[str] = None
#     report_context: Optional[Dict[str, Any]] = None
#     report_type: str = "kg"  # Default to 'kg' for backward compatibility
#     model_id: Optional[str] = None
#     session_id: Optional[str] = None  # Add this field
# ### END

# class ReportEvaluationRequest(BaseModel):
#     report_data: Dict[str, Any]
#     report_type: str = "kg"  # Default to 'kg' for backward compatibility
#     model_id: Optional[str] = None

# class ArchiveSearchRequest(BaseModel): # Class for Archive Search
#     query: str
#     max_results: int = 5
#     model_id: Optional[str] = None


# ### CLEAR CONVERSATION MEMORY
# @router.post("/message")
# async def process_report_message(
#     data: ReportMessageRequest, 
#     current_user = Depends(get_current_user)
# ):
#     """Process a message related to report writing (KG or KD) with session tracking"""
#     try:
#         # Import the session service
#         from src.services.report_session_service import get_report_session, update_report_session
        
#         # Get or create the session for this report
#         session = get_report_session(
#             session_id=data.session_id,
#             report_id=data.report_id,
#             report_type=data.report_type
#         )
        
#         # Add the user message to the session history
#         session["messages"].append({
#             "role": "user",
#             "content": data.message
#         })
        
#         # Update the context if provided
#         if data.report_context:
#             session["context"] = data.report_context
        
#         # Process with the appropriate service
#         if data.report_type == "kd":
#             result = await process_kd_message(
#                 data.message,
#                 data.report_id,
#                 data.report_context,
#                 data.model_id,
#                 data.session_id  # Make sure this is being passed
#             )
#         else:
#             result = await process_kg_message(
#                 data.message,
#                 data.report_id, 
#                 data.report_context,
#                 data.model_id,
#                 data.session_id  # Make sure this is being passed
#             )
        
#         # If successful, add AI response to session history
#         if "answer" in result and result.get("success", False):
#             session["messages"].append({
#                 "role": "assistant",
#                 "content": result["answer"]
#             })
            
#             # Update the session in our storage
#             update_report_session(
#                 session_id=data.session_id or f"{data.report_type}_{data.report_id or 'default'}",
#                 data=session
#             )
        
#         return result
#     except Exception as e:
#         print(f"Error in report AI message processing: {e}")
#         return {
#             "error": "An error occurred while processing your message.",
#             "details": str(e),
#             "success": False
#         }
# ### END

# @router.post("/evaluate")
# async def evaluate_report_endpoint(
#     data: ReportEvaluationRequest,
#     current_user = Depends(get_current_user)
# ):
#     """Evaluate a report (KG or KD) and provide feedback"""
#     if data.report_type == "kd":
#         return await evaluate_kd_report(data.report_data, data.model_id)
#     else:
#         return await evaluate_kg_report(data.report_data, data.model_id)
    

# @router.post("/check-archive")
# async def check_archive_endpoint(
#     data: ArchiveSearchRequest,
#     current_user = Depends(get_current_user)
# ):
#     """Search the archive and use AI to process results"""
#     try:
#         # Search the archive
#         search_results = await search_archive(data.query, data.max_results)
        
#         # Extract unique document sources and gather metadata
#         unique_documents = {}
#         for doc in search_results:
#             source = doc['metadata']['source']
#             if source not in unique_documents:
#                 # Try to find the full document metadata
#                 for project in await get_all_projects():
#                     for document in project.get('documents', []):
#                         if document.get('filename') == source:
#                             unique_documents[source] = {
#                                 'project_id': project.get('_id'),
#                                 'document_id': document.get('_id'),
#                                 'filename': source
#                             }
#                             break
        
#         # Format the search results for the AI
#         results_text = ""
#         if search_results:
#             results_text = "I found the following documents in the archive:\n"
#             for i, doc in enumerate(search_results):
#                 source = doc['metadata']['source']
#                 results_text += f"{i+1}. {source}: \"{doc['text'][:200]}...\"\n"
#         else:
#             results_text = "I didn't find any relevant documents in the archive."
        
#         # Get AI to process the results
#         llm = get_bedrock_llm(data.model_id)
        
#         prompt = f"""
#         The user has clicked the "Check Archive" button to find similar documents for their current report.
        
#         Here are the search results:
#         {results_text}
        
#         Please respond in this specific format:
#         1. Start with "Based on your current report, I found these relevant documents in our archive:"
#         2. If documents were found, list them clearly as "- [Filename]: brief reason why it's relevant"
#         3. If no documents were found, say "I couldn't find any closely related documents in our archive. Try adding more details to your report or using different terminology."
#         4. Conclude with a suggestion about how they might use these documents (e.g., "You might find helpful insights in these documents for your current work.")
        
#         Keep your response concise and focused on the found documents. Don't invent document names.
#         """
        
#         messages = [
#             {"role": "system", "content": "You are helping the user find relevant documents in their archive."},
#             {"role": "user", "content": prompt}
#         ]
        
#         response = llm.invoke(messages)
        
#         return {
#             "search_results": search_results,
#             "document_metadata": list(unique_documents.values()),  # Include document metadata
#             "ai_response": response.content
#         }
#     except Exception as e:
#         print(f"Error in archive search: {e}")
#         return {
#             "error": "An error occurred while searching the archive.",
#             "details": str(e)
#         }
    
# ### CLEAR CONVERSATION MEMORY
# @router.post("/clear-session")
# async def clear_report_session_endpoint(
#     data: dict = Body(...),
#     current_user = Depends(get_current_user)
# ):
#     """
#     Clear the session for a specific report.
#     """
#     try:
#         from src.services.report_session_service import clear_report_session
        
#         session_id = data.get("session_id")
#         report_id = data.get("report_id")
#         report_type = data.get("report_type", "kg")
        
#         success = clear_report_session(session_id, report_id, report_type)
        
#         if success:
#             return {"message": "Report session cleared successfully"}
#         else:
#             return {"message": "No session found to clear"}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error clearing report session: {str(e)}"
#         )

# #### TENANTS ####
# from fastapi import APIRouter, Depends, Body, HTTPException, status
# from src.utils.auth import get_current_user
# from src.services.report_ai_service import process_kg_message, evaluate_kg_report, process_kd_message, evaluate_kd_report
# from src.services.archive_service import search_archive, get_all_projects
# from src.ai_coach.bedrock_llm import get_bedrock_llm
# from src.utils.quota_decorator import log_tokens_manually
# from pydantic import BaseModel
# from typing import Optional, Dict, Any

# router = APIRouter()

# ### CLEAR CONVERSATION MEMORY
# class ReportMessageRequest(BaseModel):
#     message: str
#     report_id: Optional[str] = None
#     report_context: Optional[Dict[str, Any]] = None
#     report_type: str = "kg"  # Default to 'kg' for backward compatibility
#     model_id: Optional[str] = None
#     session_id: Optional[str] = None  # Add this field
# ### END

# class ReportEvaluationRequest(BaseModel):
#     report_data: Dict[str, Any]
#     report_type: str = "kg"  # Default to 'kg' for backward compatibility
#     model_id: Optional[str] = None

# class ArchiveSearchRequest(BaseModel): # Class for Archive Search
#     query: str
#     max_results: int = 5
#     model_id: Optional[str] = None


# ### CLEAR CONVERSATION MEMORY
# @router.post("/message")
# async def process_report_message(
#     data: ReportMessageRequest, 
#     current_user = Depends(get_current_user)
# ):
#     """Process a message related to report writing (KG or KD) with session tracking and quota enforcement"""
#     try:
#         # Check quota before making LLM call (only for tenant users)
#         if current_user.tenant_id:
#             from src.services.tenant_quota_service import quota_manager
            
#             # Estimate tokens for quota check
#             estimated_tokens = len(data.message) * 2  # Rough estimate
            
#             quota_check = await quota_manager.check_token_quota(current_user.tenant_id, estimated_tokens)
            
#             if not quota_check["allowed"]:
#                 raise HTTPException(
#                     status_code=429,
#                     detail={
#                         "error": "Token quota exceeded",
#                         "message": quota_check["message"],
#                         "current_usage": quota_check["current_usage"],
#                         "limit": quota_check["limit"]
#                     }
#                 )
        
#         # Import the session service
#         from src.services.report_session_service import get_report_session, update_report_session
        
#         # Get or create the session for this report
#         session = get_report_session(
#             session_id=data.session_id,
#             report_id=data.report_id,
#             report_type=data.report_type
#         )
        
#         # Add the user message to the session history
#         session["messages"].append({
#             "role": "user",
#             "content": data.message
#         })
        
#         # Update the context if provided
#         if data.report_context:
#             session["context"] = data.report_context
        
#         # Process with the appropriate service
#         if data.report_type == "kd":
#             result = await process_kd_message(
#                 data.message,
#                 data.report_id,
#                 data.report_context,
#                 data.model_id,
#                 data.session_id  # Make sure this is being passed
#             )
#         else:
#             result = await process_kg_message(
#                 data.message,
#                 data.report_id, 
#                 data.report_context,
#                 data.model_id,
#                 data.session_id  # Make sure this is being passed
#             )
        
#         # If successful, add AI response to session history
#         if "answer" in result and result.get("success", False):
#             session["messages"].append({
#                 "role": "assistant",
#                 "content": result["answer"]
#             })
            
#             # Update the session in our storage
#             update_report_session(
#                 session_id=data.session_id or f"{data.report_type}_{data.report_id or 'default'}",
#                 data=session
#             )
            
#             # Log token usage (if tenant user)
#             if current_user.tenant_id:
#                 actual_tokens = len(result.get("answer", "")) + len(data.message)
                
#                 await log_tokens_manually(
#                     tenant_id=current_user.tenant_id,
#                     user_email=current_user.username,
#                     api_endpoint="/report-ai/message",
#                     token_type="llm",
#                     tokens_used=actual_tokens,
#                     model=data.model_id or "default"
#                 )
                
#                 # Add quota warning if needed
#                 quota_check = await quota_manager.check_token_quota(current_user.tenant_id, 0)
#                 if quota_check["warning"]:
#                     result["quota_warning"] = quota_check["message"]
        
#         return result
#     except HTTPException:
#         raise  # Re-raise quota exceeded errors
#     except Exception as e:
#         print(f"Error in report AI message processing: {e}")
#         return {
#             "error": "An error occurred while processing your message.",
#             "details": str(e),
#             "success": False
#         }
# ### END

# @router.post("/evaluate")
# async def evaluate_report_endpoint(
#     data: ReportEvaluationRequest,
#     current_user = Depends(get_current_user)
# ):
#     """Evaluate a report (KG or KD) and provide feedback with quota enforcement"""
#     # Check quota before making LLM call (only for tenant users)
#     if current_user.tenant_id:
#         from src.services.tenant_quota_service import quota_manager
        
#         # Estimate tokens for evaluation
#         estimated_tokens = 1500  # Reports are typically longer
        
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
    
#     # Process evaluation
#     if data.report_type == "kd":
#         result = await evaluate_kd_report(data.report_data, data.model_id)
#     else:
#         result = await evaluate_kg_report(data.report_data, data.model_id)
    
#     # Log token usage (if tenant user)
#     if current_user.tenant_id and isinstance(result, dict):
#         actual_tokens = len(str(result)) + len(str(data.report_data))
        
#         await log_tokens_manually(
#             tenant_id=current_user.tenant_id,
#             user_email=current_user.username,
#             api_endpoint="/report-ai/evaluate",
#             token_type="llm",
#             tokens_used=actual_tokens,
#             model=data.model_id or "default"
#         )
    
#     return result
    

# @router.post("/check-archive")
# async def check_archive_endpoint(
#     data: ArchiveSearchRequest,
#     current_user = Depends(get_current_user)
# ):
#     """Search the archive and use AI to process results with quota enforcement"""
#     try:
#         # Check quota for embedding search (only for tenant users)
#         if current_user.tenant_id:
#             from src.services.tenant_quota_service import quota_manager
            
#             # Estimate tokens for embeddings + LLM processing
#             embedding_tokens = len(data.query) * 1  # Embeddings use fewer tokens
#             llm_tokens = 800  # For processing results
#             total_estimated = embedding_tokens + llm_tokens
            
#             quota_check = await quota_manager.check_token_quota(current_user.tenant_id, total_estimated)
            
#             if not quota_check["allowed"]:
#                 raise HTTPException(
#                     status_code=429,
#                     detail={
#                         "error": "Token quota exceeded",
#                         "message": quota_check["message"],
#                         "current_usage": quota_check["current_usage"],
#                         "limit": quota_check["limit"]
#                     }
#                 )
        
#         # Search the archive
#         search_results = await search_archive(data.query, data.max_results)
        
#         # Extract unique document sources and gather metadata
#         unique_documents = {}
#         for doc in search_results:
#             source = doc['metadata']['source']
#             if source not in unique_documents:
#                 # Try to find the full document metadata
#                 for project in await get_all_projects():
#                     for document in project.get('documents', []):
#                         if document.get('filename') == source:
#                             unique_documents[source] = {
#                                 'project_id': project.get('_id'),
#                                 'document_id': document.get('_id'),
#                                 'filename': source
#                             }
#                             break
        
#         # Format the search results for the AI
#         results_text = ""
#         if search_results:
#             results_text = "I found the following documents in the archive:\n"
#             for i, doc in enumerate(search_results):
#                 source = doc['metadata']['source']
#                 results_text += f"{i+1}. {source}: \"{doc['text'][:200]}...\"\n"
#         else:
#             results_text = "I didn't find any relevant documents in the archive."
        
#         # Get AI to process the results
#         llm = get_bedrock_llm(data.model_id)
        
#         prompt = f"""
#         The user has clicked the "Check Archive" button to find similar documents for their current report.
        
#         Here are the search results:
#         {results_text}
        
#         Please respond in this specific format:
#         1. Start with "Based on your current report, I found these relevant documents in our archive:"
#         2. If documents were found, list them clearly as "- [Filename]: brief reason why it's relevant"
#         3. If no documents were found, say "I couldn't find any closely related documents in our archive. Try adding more details to your report or using different terminology."
#         4. Conclude with a suggestion about how they might use these documents (e.g., "You might find helpful insights in these documents for your current work.")
        
#         Keep your response concise and focused on the found documents. Don't invent document names.
#         """
        
#         messages = [
#             {"role": "system", "content": "You are helping the user find relevant documents in their archive."},
#             {"role": "user", "content": prompt}
#         ]
        
#         response = llm.invoke(messages)
        
#         # Log token usage (if tenant user)
#         if current_user.tenant_id:
#             # Log embedding tokens
#             await log_tokens_manually(
#                 tenant_id=current_user.tenant_id,
#                 user_email=current_user.username,
#                 api_endpoint="/report-ai/check-archive",
#                 token_type="embedding",
#                 tokens_used=embedding_tokens,
#                 model="embedding-model"
#             )
            
#             # Log LLM tokens
#             actual_llm_tokens = len(response.content) + len(prompt)
#             await log_tokens_manually(
#                 tenant_id=current_user.tenant_id,
#                 user_email=current_user.username,
#                 api_endpoint="/report-ai/check-archive",
#                 token_type="llm",
#                 tokens_used=actual_llm_tokens,
#                 model=data.model_id or "default"
#             )
        
#         return {
#             "search_results": search_results,
#             "document_metadata": list(unique_documents.values()),  # Include document metadata
#             "ai_response": response.content
#         }
#     except HTTPException:
#         raise  # Re-raise quota exceeded errors
#     except Exception as e:
#         print(f"Error in archive search: {e}")
#         return {
#             "error": "An error occurred while searching the archive.",
#             "details": str(e)
#         }
    
# ### CLEAR CONVERSATION MEMORY
# @router.post("/clear-session")
# async def clear_report_session_endpoint(
#     data: dict = Body(...),
#     current_user = Depends(get_current_user)
# ):
#     """
#     Clear the session for a specific report.
#     """
#     try:
#         from src.services.report_session_service import clear_report_session
        
#         session_id = data.get("session_id")
#         report_id = data.get("report_id")
#         report_type = data.get("report_type", "kg")
        
#         success = clear_report_session(session_id, report_id, report_type)
        
#         if success:
#             return {"message": "Report session cleared successfully"}
#         else:
#             return {"message": "No session found to clear"}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error clearing report session: {str(e)}"
#         )

from fastapi import APIRouter, Depends, Body, HTTPException, status
from src.utils.auth import get_current_user
from src.services.report_ai_service import process_kg_message, evaluate_kg_report, process_kd_message, evaluate_kd_report
from src.services.archive_service import search_archive, get_all_projects
from src.ai_coach.bedrock_llm import get_bedrock_llm
from src.utils.quota_decorator import log_tokens_manually
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Phase 2 imports
from src.config.model_constants import LLM_MODEL, EMBEDDING_MODEL
from src.services.token_usage_service import token_logger

router = APIRouter()

### CLEAR CONVERSATION MEMORY
class ReportMessageRequest(BaseModel):
    message: str
    report_id: Optional[str] = None
    report_context: Optional[Dict[str, Any]] = None
    report_type: str = "kg"  # Default to 'kg' for backward compatibility
    model_id: Optional[str] = None  # Phase 2: Will be ignored (standardized)
    session_id: Optional[str] = None  # Add this field
### END

class ReportEvaluationRequest(BaseModel):
    report_data: Dict[str, Any]
    report_type: str = "kg"  # Default to 'kg' for backward compatibility
    model_id: Optional[str] = None  # Phase 2: Will be ignored (standardized)

class ArchiveSearchRequest(BaseModel): # Class for Archive Search
    query: str
    max_results: int = 5
    model_id: Optional[str] = None  # Phase 2: Will be ignored (standardized)


### CLEAR CONVERSATION MEMORY
@router.post("/message")
async def process_report_message(
    data: ReportMessageRequest, 
    current_user = Depends(get_current_user)
):
    """Process a message related to report writing (KG or KD) with session tracking and quota enforcement"""
    try:
        # Check quota before making LLM call (only for tenant users)
        if current_user.tenant_id:
            from src.services.tenant_quota_service import quota_manager
            
            # Use improved token estimation
            estimated_tokens = token_logger.estimate_tokens(data.message) * 2  # Message + expected response
            
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
        
        # Import the session service
        from src.services.report_session_service import get_report_session, update_report_session
        
        # Get or create the session for this report
        session = get_report_session(
            session_id=data.session_id,
            report_id=data.report_id,
            report_type=data.report_type
        )
        
        # Add the user message to the session history
        session["messages"].append({
            "role": "user",
            "content": data.message
        })
        
        # Update the context if provided
        if data.report_context:
            session["context"] = data.report_context
        
        # Force standardized model (ignore data.model_id)
        standardized_model = LLM_MODEL  # Always use Llama 3.3
        
        # Process with the appropriate service using standardized model
        if data.report_type == "kd":
            result = await process_kd_message(
                data.message,
                data.report_id,
                data.report_context,
                standardized_model,  # Force standardized model
                data.session_id
            )
        else:
            result = await process_kg_message(
                data.message,
                data.report_id, 
                data.report_context,
                standardized_model,  # Force standardized model
                data.session_id
            )
        
        # If successful, add AI response to session history
        if "answer" in result and result.get("success", False):
            session["messages"].append({
                "role": "assistant",
                "content": result["answer"]
            })
            
            # Update the session in our storage
            update_report_session(
                session_id=data.session_id or f"{data.report_type}_{data.report_id or 'default'}",
                data=session
            )
            
            # Enhanced token logging for tenant users
            if current_user.tenant_id:
                # Use enhanced logging with accurate token counting
                token_info = await token_logger.log_llm_usage_from_texts(
                    tenant_id=current_user.tenant_id,
                    user_email=current_user.username,
                    endpoint="/report-ai/message",
                    input_text=data.message,
                    output_text=result.get("answer", ""),
                    model=standardized_model
                )
                
                # Add quota warning if needed
                quota_check = await quota_manager.check_token_quota(current_user.tenant_id, 0)
                if quota_check["warning"]:
                    result["quota_warning"] = quota_check["message"]
                
                # Add model used info
                result["model_used"] = standardized_model
                result["token_info"] = token_info  # For debugging/transparency
        
        return result
    except HTTPException:
        raise  # Re-raise quota exceeded errors
    except Exception as e:
        print(f"Error in report AI message processing: {e}")
        return {
            "error": "An error occurred while processing your message.",
            "details": str(e),
            "success": False
        }
### END

@router.post("/evaluate")
async def evaluate_report_endpoint(
    data: ReportEvaluationRequest,
    current_user = Depends(get_current_user)
):
    """Evaluate a report (KG or KD) and provide feedback with quota enforcement"""
    # Check quota before making LLM call (only for tenant users)
    if current_user.tenant_id:
        from src.services.tenant_quota_service import quota_manager
        
        # Use improved token estimation
        estimated_tokens = token_logger.estimate_tokens(str(data.report_data)) + 1000  # Report + evaluation response
        
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
    
    # Force standardized model
    standardized_model = LLM_MODEL  # Always use Llama 3.3
    
    # Process evaluation with standardized model
    if data.report_type == "kd":
        result = await evaluate_kd_report(data.report_data, standardized_model)
    else:
        result = await evaluate_kg_report(data.report_data, standardized_model)
    
    # Enhanced token logging for tenant users
    if current_user.tenant_id and isinstance(result, dict):
        # Use enhanced logging with accurate token counting
        token_info = await token_logger.log_llm_usage_from_texts(
            tenant_id=current_user.tenant_id,
            user_email=current_user.username,
            endpoint="/report-ai/evaluate",
            input_text=str(data.report_data),
            output_text=str(result),
            model=standardized_model
        )
        
        # Add model info to result
        result["model_used"] = standardized_model
        result["token_info"] = token_info
    
    return result
    

@router.post("/check-archive")
async def check_archive_endpoint(
    data: ArchiveSearchRequest,
    current_user = Depends(get_current_user)
):
    """Search the archive and use AI to process results with quota enforcement"""
    try:
        # Check quota for embedding search (only for tenant users)
        if current_user.tenant_id:
            from src.services.tenant_quota_service import quota_manager
            
            # Use improved token estimation
            embedding_tokens = token_logger.estimate_tokens(data.query)
            llm_tokens = 800  # For processing results
            total_estimated = embedding_tokens + llm_tokens
            
            quota_check = await quota_manager.check_token_quota(current_user.tenant_id, total_estimated)
            
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
        
        # Search the archive
        search_results = await search_archive(data.query, data.max_results)
        
        # Extract unique document sources and gather metadata
        unique_documents = {}
        for doc in search_results:
            source = doc['metadata']['source']
            if source not in unique_documents:
                # Try to find the full document metadata
                for project in await get_all_projects():
                    for document in project.get('documents', []):
                        if document.get('filename') == source:
                            unique_documents[source] = {
                                'project_id': project.get('_id'),
                                'document_id': document.get('_id'),
                                'filename': source
                            }
                            break
        
        # Format the search results for the AI
        results_text = ""
        if search_results:
            results_text = "I found the following documents in the archive:\n"
            for i, doc in enumerate(search_results):
                source = doc['metadata']['source']
                results_text += f"{i+1}. {source}: \"{doc['text'][:200]}...\"\n"
        else:
            results_text = "I didn't find any relevant documents in the archive."
        
        # Force standardized models
        standardized_llm_model = LLM_MODEL  # Always use Llama 3.3
        standardized_embedding_model = EMBEDDING_MODEL  # Always use Cohere
        
        # Get AI to process the results with standardized model
        llm = get_bedrock_llm(standardized_llm_model)
        
        prompt = f"""
        The user has clicked the "Check Archive" button to find similar documents for their current report.
        
        Here are the search results:
        {results_text}
        
        Please respond in this specific format:
        1. Start with "Based on your current report, I found these relevant documents in our archive:"
        2. If documents were found, list them clearly as "- [Filename]: brief reason why it's relevant"
        3. If no documents were found, say "I couldn't find any closely related documents in our archive. Try adding more details to your report or using different terminology."
        4. Conclude with a suggestion about how they might use these documents (e.g., "You might find helpful insights in these documents for your current work.")
        
        Keep your response concise and focused on the found documents. Don't invent document names.
        """
        
        messages = [
            {"role": "system", "content": "You are helping the user find relevant documents in their archive."},
            {"role": "user", "content": prompt}
        ]
        
        response = llm.invoke(messages)
        
        # Enhanced token logging for tenant users
        if current_user.tenant_id:
            # Log embedding tokens
            embedding_token_info = await token_logger.log_embedding_usage_from_text(
                tenant_id=current_user.tenant_id,
                user_email=current_user.username,
                endpoint="/report-ai/check-archive",
                text_content=data.query,
                model=standardized_embedding_model
            )
            
            # Log LLM tokens
            llm_token_info = await token_logger.log_llm_usage_from_texts(
                tenant_id=current_user.tenant_id,
                user_email=current_user.username,
                endpoint="/report-ai/check-archive",
                input_text=prompt,
                output_text=response.content,
                model=standardized_llm_model
            )
        
        return {
            "search_results": search_results,
            "document_metadata": list(unique_documents.values()),
            "ai_response": response.content,
            "models_used": {
                "llm_model": standardized_llm_model,
                "embedding_model": standardized_embedding_model
            }
        }
    except HTTPException:
        raise  # Re-raise quota exceeded errors
    except Exception as e:
        print(f"Error in archive search: {e}")
        return {
            "error": "An error occurred while searching the archive.",
            "details": str(e)
        }
    
### CLEAR CONVERSATION MEMORY
@router.post("/clear-session")
async def clear_report_session_endpoint(
    data: dict = Body(...),
    current_user = Depends(get_current_user)
):
    """
    Clear the session for a specific report.
    """
    try:
        from src.services.report_session_service import clear_report_session
        
        session_id = data.get("session_id")
        report_id = data.get("report_id")
        report_type = data.get("report_type", "kg")
        
        success = clear_report_session(session_id, report_id, report_type)
        
        if success:
            return {"message": "Report session cleared successfully"}
        else:
            return {"message": "No session found to clear"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing report session: {str(e)}"
        )

@router.get("/models")
async def get_available_models(current_user = Depends(get_current_user)):
    """
    Get available AI models for report generation (Phase 2: Returns only standardized models)
    """
    return {
        "available_models": [
            {
                "id": LLM_MODEL,
                "name": "Llama 3.3 70B (Standardized)",
                "description": "High-quality standardized model for all report generation",
                "standardized": True,
                "cost_efficient": True
            }
        ],
        "embedding_model": {
            "id": EMBEDDING_MODEL,
            "name": "Cohere Multilingual (Standardized)",
            "description": "Multilingual embedding model for archive search",
            "standardized": True
        },
        "default_llm_model": LLM_MODEL,
        "default_embedding_model": EMBEDDING_MODEL,
        "message": "Model selection has been simplified. All requests now use optimized standardized models."
    }