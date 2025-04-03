from fastapi import APIRouter, Depends, Body
from src.utils.auth import get_current_user
from src.services.report_ai_service import process_kg_message, evaluate_kg_report, process_kd_message, evaluate_kd_report
from src.services.archive_service import search_archive, get_all_projects
from src.ai_coach.bedrock_llm import get_bedrock_llm
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter()

class ReportMessageRequest(BaseModel):
    message: str
    report_id: Optional[str] = None
    report_context: Optional[Dict[str, Any]] = None
    report_type: str = "kg"  # Default to 'kg' for backward compatibility
    model_id: Optional[str] = None

class ReportEvaluationRequest(BaseModel):
    report_data: Dict[str, Any]
    report_type: str = "kg"  # Default to 'kg' for backward compatibility
    model_id: Optional[str] = None

class ArchiveSearchRequest(BaseModel): # Class for Archive Search
    query: str
    max_results: int = 5
    model_id: Optional[str] = None

@router.post("/message")
async def process_report_message(
    data: ReportMessageRequest, 
    current_user = Depends(get_current_user)
):
    """Process a message related to report writing (KG or KD)"""
    if data.report_type == "kd":
        return await process_kd_message(data.message, data.report_context, data.model_id)
    else:
        return await process_kg_message(data.message, data.report_context, data.model_id)

@router.post("/evaluate")
async def evaluate_report_endpoint(
    data: ReportEvaluationRequest,
    current_user = Depends(get_current_user)
):
    """Evaluate a report (KG or KD) and provide feedback"""
    if data.report_type == "kd":
        return await evaluate_kd_report(data.report_data, data.model_id)
    else:
        return await evaluate_kg_report(data.report_data, data.model_id)
    

# @router.post("/check-archive")
# async def check_archive_endpoint(
#     data: ArchiveSearchRequest,
#     current_user = Depends(get_current_user)
# ):
#     """Search the archive and use AI to process results"""
#     try:
#         # Search the archive
#         search_results = await search_archive(data.query, data.max_results)
        
#         # Format the search results for the AI
#         results_text = ""
#         if search_results:
#             results_text = "I found the following documents in the archive:\n"
#             for i, doc in enumerate(search_results):
#                 results_text += f"{i+1}. {doc['metadata']['source']}: \"{doc['text'][:200]}...\"\n"
#         else:
#             results_text = "I didn't find any relevant documents in the archive."
        
#         # Get AI to process the results
#         llm = get_bedrock_llm()
        
#         # Create a more specific prompt for the desired response format
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
#             "ai_response": response.content
#         }
#     except Exception as e:
#         print(f"Error in archive search: {e}")
#         return {
#             "error": "An error occurred while searching the archive.",
#             "details": str(e)
#         }
@router.post("/check-archive")
async def check_archive_endpoint(
    data: ArchiveSearchRequest,
    current_user = Depends(get_current_user)
):
    """Search the archive and use AI to process results"""
    try:
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
        
        # Get AI to process the results
        llm = get_bedrock_llm(data.model_id)
        
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
        
        return {
            "search_results": search_results,
            "document_metadata": list(unique_documents.values()),  # Include document metadata
            "ai_response": response.content
        }
    except Exception as e:
        print(f"Error in archive search: {e}")
        return {
            "error": "An error occurred while searching the archive.",
            "details": str(e)
        }