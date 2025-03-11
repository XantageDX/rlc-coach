from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

from src.models.integration_event_models import (
    IntegrationEventCreate, 
    IntegrationEventUpdate, 
    IntegrationEventResponse, 
    IntegrationEventInDB
)
from src.utils.db import db

# Get collections
integration_events_collection = db["integration_events"]


async def create_integration_event(
    event_data: IntegrationEventCreate, 
    project_id: str, 
    current_user
) -> IntegrationEventResponse:
    """Create a new integration event"""
    
    # Generate a unique ID
    event_id = str(ObjectId())
    
    # Get the last position to determine the new position
    last_event = integration_events_collection.find_one(
        {"project_id": project_id},
        sort=[("position", -1)]
    )
    
    position = 0
    if last_event:
        position = last_event.get("position", 0) + 1
    
    # Create event in database
    event_in_db = IntegrationEventInDB(
        id=event_id,
        project_id=project_id,
        name=event_data.name,
        description=event_data.description,
        date=event_data.date,
        created_by=current_user.username,
        position=position
    )

    # Insert into DB
    result = integration_events_collection.insert_one(event_in_db.dict())
    
    if not result.acknowledged:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create integration event",
        )
    
    # Return event
    return IntegrationEventResponse(**event_in_db.dict())


async def get_project_integration_events(
    project_id: str, 
    current_user
) -> List[IntegrationEventResponse]:
    """Get all integration events for a project"""
    
    cursor = integration_events_collection.find(
        {"project_id": project_id, "status": {"$ne": "deleted"}}
    ).sort("position", 1)
    
    events = []
    for doc in cursor:
        events.append(IntegrationEventResponse(**doc))
    
    return events


async def get_integration_event(
    event_id: str, 
    project_id: str, 
    current_user
) -> IntegrationEventResponse:
    """Get a specific integration event"""
    
    event = integration_events_collection.find_one({"id": event_id, "project_id": project_id})
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration event not found",
        )
    
    return IntegrationEventResponse(**event)


async def update_integration_event(
    event_id: str, 
    event_data: IntegrationEventUpdate, 
    project_id: str, 
    current_user
) -> IntegrationEventResponse:
    """Update an integration event"""
    
    # Find event
    event = integration_events_collection.find_one({"id": event_id, "project_id": project_id})
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration event not found",
        )
    
    # Create update data
    update_data = {k: v for k, v in event_data.dict(exclude_unset=True).items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Update event in DB
        result = integration_events_collection.update_one(
            {"id": event_id},
            {"$set": update_data}
        )
        
        if not result.modified_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update integration event",
            )
    
    # Get updated event
    updated_event = integration_events_collection.find_one({"id": event_id})
    return IntegrationEventResponse(**updated_event)


async def delete_integration_event(
    event_id: str, 
    project_id: str, 
    current_user
) -> dict:
    """Delete an integration event (soft delete)"""
    
    # Find event
    event = integration_events_collection.find_one({"id": event_id, "project_id": project_id})
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration event not found",
        )
    
    # Update event status to deleted
    result = integration_events_collection.update_one(
        {"id": event_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
    )
    
    if not result.modified_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete integration event",
        )
    
    return {"message": "Integration event successfully deleted"}


async def reorder_integration_events(
    project_id: str, 
    event_order: List[str], 
    current_user
) -> dict:
    """Reorder integration events based on provided sequence of IDs"""
    
    for idx, event_id in enumerate(event_order):
        # Update each event with its new position
        integration_events_collection.update_one(
            {"id": event_id, "project_id": project_id},
            {"$set": {"position": idx, "updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Integration events reordered successfully"}