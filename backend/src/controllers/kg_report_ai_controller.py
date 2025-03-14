from fastapi import APIRouter, Depends, Body
from src.utils.auth import get_current_user
from src.services.kg_report_ai_service import process_kg_message, evaluate_kg_report
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter()

class KGMessageRequest(BaseModel):
    message: str
    report_id: Optional[str] = None
    report_context: Optional[Dict[str, Any]] = None

class KGEvaluationRequest(BaseModel):
    report_data: Dict[str, Any]

@router.post("/message")
async def process_kg_report_message(
    data: KGMessageRequest, 
    current_user = Depends(get_current_user)
):
    """Process a message related to Knowledge Gap report writing"""
    return await process_kg_message(data.message, data.report_context)

@router.post("/evaluate")
async def evaluate_kg_report_endpoint(
    data: KGEvaluationRequest,
    current_user = Depends(get_current_user)
):
    """Evaluate a Knowledge Gap report and provide feedback"""
    return await evaluate_kg_report(data.report_data)