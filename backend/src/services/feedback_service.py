from bson import ObjectId
from datetime import datetime
from src.models.feedback_models import FeedbackCreate, FeedbackInDB
from src.utils.db import db

# Collection reference
feedback_collection = db["feedback"]

async def store_feedback(feedback_data: FeedbackCreate, user_email: str, rag_prompt: str = None):
    """Store user feedback in the database."""
    try:
        # Create feedback document with user info and timestamp
        feedback_dict = feedback_data.dict()
        
        # Add extra fields
        feedback_dict.update({
            'userEmail': user_email,
            'timestamp': datetime.utcnow(),
        })
        
        # Add RAG prompt if provided
        if rag_prompt:
            feedback_dict['ragPrompt'] = rag_prompt
        
        # Insert into DB
        result = feedback_collection.insert_one(feedback_dict)
        
        return result.inserted_id is not None
        
    except Exception as e:
        print(f"Error storing feedback: {e}")
        return False