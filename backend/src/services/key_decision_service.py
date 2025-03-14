from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

from src.models.key_decision_models import (
    KeyDecisionCreate, 
    KeyDecisionUpdate, 
    KeyDecisionResponse, 
    KeyDecisionInDB
)
from src.utils.db import db
from src.services.integration_event_service import get_integration_event

# Get collections
key_decisions_collection = db["key_decisions"]


async def create_key_decision(
    decision_data: KeyDecisionCreate, 
    project_id: str, 
    current_user
) -> KeyDecisionResponse:
    """Create a new key decision"""
    
    # Check if integration event exists and belongs to the project
    await get_integration_event(decision_data.integration_event_id, project_id, current_user)
    
    # Generate a unique ID
    decision_id = str(ObjectId())
    
    # Create decision in database
    decision_in_db = KeyDecisionInDB(
        id=decision_id,
        project_id=project_id,
        title=decision_data.title,
        description=decision_data.description,
        integration_event_id=decision_data.integration_event_id,
        owner=decision_data.owner,
        decision_maker=decision_data.decision_maker,
        sequence=decision_data.sequence,
        purpose=decision_data.purpose,
        what_we_have_done=decision_data.what_we_have_done,
        what_we_have_learned=decision_data.what_we_have_learned,
        recommendations=decision_data.recommendations,
        created_by=current_user.username
    )

    # Insert into DB
    result = key_decisions_collection.insert_one(decision_in_db.dict())
    
    if not result.acknowledged:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create key decision",
        )
    
    # Return decision
    return KeyDecisionResponse(**decision_in_db.dict())


async def get_project_key_decisions(
    project_id: str, 
    integration_event_id: Optional[str] = None,
    current_user = None
) -> List[KeyDecisionResponse]:
    """Get all key decisions for a project, optionally filtered by integration event"""
    
    # Create filter
    filter_query = {"project_id": project_id, "status": {"$ne": "deleted"}}
    
    # Add integration event filter if provided
    if integration_event_id:
        filter_query["integration_event_id"] = integration_event_id
    
    cursor = key_decisions_collection.find(filter_query)
    
    decisions = []
    for doc in cursor:
        decisions.append(KeyDecisionResponse(**doc))
    
    return decisions


async def get_key_decision(
    decision_id: str, 
    project_id: str, 
    current_user
) -> KeyDecisionResponse:
    """Get a specific key decision"""
    
    decision = key_decisions_collection.find_one({"id": decision_id, "project_id": project_id})
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key decision not found",
        )
    
    return KeyDecisionResponse(**decision)


async def update_key_decision(
    decision_id: str, 
    decision_data: KeyDecisionUpdate, 
    project_id: str, 
    current_user
) -> KeyDecisionResponse:
    """Update a key decision"""
    
    # Find decision
    decision = key_decisions_collection.find_one({"id": decision_id, "project_id": project_id})
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key decision not found",
        )
    
    # Check if integration event exists and belongs to the project if it's being updated
    if decision_data.integration_event_id:
        await get_integration_event(decision_data.integration_event_id, project_id, current_user)
    
    # Create update data
    update_data = {k: v for k, v in decision_data.dict(exclude_unset=True).items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Update decision in DB
        result = key_decisions_collection.update_one(
            {"id": decision_id},
            {"$set": update_data}
        )
        
        if not result.modified_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update key decision",
            )
    
    # Get updated decision
    updated_decision = key_decisions_collection.find_one({"id": decision_id})
    return KeyDecisionResponse(**updated_decision)


async def delete_key_decision(
    decision_id: str, 
    project_id: str, 
    current_user
) -> dict:
    """Delete a key decision (soft delete)"""
    
    # Find decision
    decision = key_decisions_collection.find_one({"id": decision_id, "project_id": project_id})
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key decision not found",
        )
    
    # Update decision status to deleted
    result = key_decisions_collection.update_one(
        {"id": decision_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
    )
    
    if not result.modified_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete key decision",
        )
    
    # Note: In a real application, you might want to also handle associated knowledge gaps
    
    return {"message": "Key decision successfully deleted"}


async def add_knowledge_gap_to_decision(
    decision_id: str, 
    kg_id: str, 
    project_id: str, 
    current_user
) -> KeyDecisionResponse:
    """Add a knowledge gap to a key decision"""
    
    # Find decision
    decision = key_decisions_collection.find_one({"id": decision_id, "project_id": project_id})
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key decision not found",
        )
    
    # Add knowledge gap ID if not already present
    if kg_id not in decision.get("knowledge_gaps", []):
        result = key_decisions_collection.update_one(
            {"id": decision_id},
            {
                "$push": {"knowledge_gaps": kg_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if not result.modified_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add knowledge gap to decision",
            )
    
    # Get updated decision
    updated_decision = key_decisions_collection.find_one({"id": decision_id})
    return KeyDecisionResponse(**updated_decision)


async def remove_knowledge_gap_from_decision(
    decision_id: str, 
    kg_id: str, 
    project_id: str, 
    current_user
) -> KeyDecisionResponse:
    """Remove a knowledge gap from a key decision"""
    
    # Find decision
    decision = key_decisions_collection.find_one({"id": decision_id, "project_id": project_id})
    
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key decision not found",
        )
    
    # Remove knowledge gap ID if present
    if kg_id in decision.get("knowledge_gaps", []):
        result = key_decisions_collection.update_one(
            {"id": decision_id},
            {
                "$pull": {"knowledge_gaps": kg_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if not result.modified_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove knowledge gap from decision",
            )
    
    # Get updated decision
    updated_decision = key_decisions_collection.find_one({"id": decision_id})
    return KeyDecisionResponse(**updated_decision)