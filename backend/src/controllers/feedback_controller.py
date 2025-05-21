from fastapi import APIRouter, Depends, HTTPException, status
from src.models.feedback_models import FeedbackCreate, FeedbackResponse
from src.services.feedback_service import store_feedback
from src.utils.auth import get_current_user

router = APIRouter()

@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate, 
    current_user = Depends(get_current_user)
):
    """
    Submit user feedback for an AI interaction.
    """
    try:
        # Get the user's email from the token
        user_email = current_user.username
        
        # Get the RAG prompt if possible (requires changes to ai_coach_service and report_ai_service)
        rag_prompt = None
        
        # Store the feedback
        success = await store_feedback(feedback_data, user_email, rag_prompt)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store feedback"
            )
        
        return {
            "success": True,
            "message": "Feedback submitted successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )