from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

from src.models.knowledge_gap_models import (
    KnowledgeGapCreate, 
    KnowledgeGapUpdate, 
    KnowledgeGapResponse, 
    KnowledgeGapInDB
)
from src.utils.db import db
from src.services.key_decision_service import get_key_decision, add_knowledge_gap_to_decision

# Get collections
knowledge_gaps_collection = db["knowledge_gaps"]


async def create_knowledge_gap(
    kg_data: KnowledgeGapCreate, 
    project_id: str, 
    current_user
) -> KnowledgeGapResponse:
    """Create a new knowledge gap"""
    
    # Check if the key decision exists and belongs to the project
    await get_key_decision(kg_data.key_decision_id, project_id, current_user)
    
    # Generate a unique ID
    kg_id = str(ObjectId())
    
    # Create knowledge gap in database
    kg_in_db = KnowledgeGapInDB(
        id=kg_id,
        project_id=project_id,
        title=kg_data.title,
        description=kg_data.description,
        key_decision_id=kg_data.key_decision_id,
        owner=kg_data.owner,
        contributors=kg_data.contributors,
        learning_cycle=kg_data.learning_cycle,
        sequence=kg_data.sequence,  # Make sure this is included
        kd_sequence=kg_data.kd_sequence,  # Make sure this is included
        purpose=kg_data.purpose,
        what_we_have_done=kg_data.what_we_have_done,
        what_we_have_learned=kg_data.what_we_have_learned,
        recommendations=kg_data.recommendations,
        created_by=current_user.username
    )

    # Insert into DB
    result = knowledge_gaps_collection.insert_one(kg_in_db.dict())
    
    if not result.acknowledged:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create knowledge gap",
        )
    
    # Add this knowledge gap to the key decision
    await add_knowledge_gap_to_decision(kg_data.key_decision_id, kg_id, project_id, current_user)
    
    # Return knowledge gap
    return KnowledgeGapResponse(**kg_in_db.dict())


async def get_project_knowledge_gaps(
    project_id: str, 
    key_decision_id: Optional[str] = None,
    current_user = None
) -> List[KnowledgeGapResponse]:
    """Get all knowledge gaps for a project, optionally filtered by key decision"""
    
    # Create filter
    filter_query = {"project_id": project_id, "status": {"$ne": "deleted"}}
    
    # Add key decision filter if provided
    if key_decision_id:
        filter_query["key_decision_id"] = key_decision_id
    
    cursor = knowledge_gaps_collection.find(filter_query)
    
    knowledge_gaps = []
    for doc in cursor:
        knowledge_gaps.append(KnowledgeGapResponse(**doc))
    
    return knowledge_gaps


async def get_knowledge_gap(
    kg_id: str, 
    project_id: str, 
    current_user
) -> KnowledgeGapResponse:
    """Get a specific knowledge gap"""
    
    kg = knowledge_gaps_collection.find_one({"id": kg_id, "project_id": project_id})
    
    if not kg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge gap not found",
        )
    
    return KnowledgeGapResponse(**kg)


async def update_knowledge_gap(
    kg_id: str, 
    kg_data: KnowledgeGapUpdate, 
    project_id: str, 
    current_user
) -> KnowledgeGapResponse:
    """Update a knowledge gap"""
    
    # Find knowledge gap
    kg = knowledge_gaps_collection.find_one({"id": kg_id, "project_id": project_id})
    
    if not kg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge gap not found",
        )
    
    # Check if key decision exists and belongs to the project if it's being updated
    if kg_data.key_decision_id and kg_data.key_decision_id != kg["key_decision_id"]:
        # If the key decision is changing, we need to update both old and new key decisions
        await get_key_decision(kg_data.key_decision_id, project_id, current_user)
        
        # Add to new key decision
        await add_knowledge_gap_to_decision(kg_data.key_decision_id, kg_id, project_id, current_user)
        
        # Remove from old key decision
        from src.services.key_decision_service import remove_knowledge_gap_from_decision
        await remove_knowledge_gap_from_decision(kg["key_decision_id"], kg_id, project_id, current_user)
    
    # Create update data
    update_data = {k: v for k, v in kg_data.dict(exclude_unset=True).items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Update knowledge gap in DB
        result = knowledge_gaps_collection.update_one(
            {"id": kg_id},
            {"$set": update_data}
        )
        
        if not result.modified_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update knowledge gap",
            )
    
    # Get updated knowledge gap
    updated_kg = knowledge_gaps_collection.find_one({"id": kg_id})
    return KnowledgeGapResponse(**updated_kg)


async def delete_knowledge_gap(
    kg_id: str, 
    project_id: str, 
    current_user
) -> dict:
    """Delete a knowledge gap (soft delete)"""
    
    # Find knowledge gap
    kg = knowledge_gaps_collection.find_one({"id": kg_id, "project_id": project_id})
    
    if not kg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge gap not found",
        )
    
    # Remove from key decision
    from src.services.key_decision_service import remove_knowledge_gap_from_decision
    await remove_knowledge_gap_from_decision(kg["key_decision_id"], kg_id, project_id, current_user)
    
    # Update knowledge gap status to deleted
    result = knowledge_gaps_collection.update_one(
        {"id": kg_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
    )
    
    if not result.modified_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete knowledge gap",
        )
    
    return {"message": "Knowledge gap successfully deleted"}