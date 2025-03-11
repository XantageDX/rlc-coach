from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from typing import List

from src.models.integration_event_models import (
    IntegrationEventCreate, 
    IntegrationEventUpdate, 
    IntegrationEventResponse
)
from src.services.integration_event_service import (
    create_integration_event,
    get_project_integration_events,
    get_integration_event,
    update_integration_event,
    delete_integration_event,
    reorder_integration_events
)
from src.utils.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=IntegrationEventResponse, status_code=status.HTTP_201_CREATED)
async def create_new_integration_event(
    project_id: str,
    event_data: IntegrationEventCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new integration event.
    """
    return await create_integration_event(event_data, project_id, current_user)


@router.get("/", response_model=List[IntegrationEventResponse])
async def read_project_integration_events(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get all integration events for a project.
    """
    return await get_project_integration_events(project_id, current_user)


@router.get("/{event_id}", response_model=IntegrationEventResponse)
async def read_integration_event(
    project_id: str,
    event_id: str = Path(..., title="The ID of the integration event to get"),
    current_user = Depends(get_current_user)
):
    """
    Get a specific integration event.
    """
    return await get_integration_event(event_id, project_id, current_user)


@router.put("/{event_id}", response_model=IntegrationEventResponse)
async def update_existing_integration_event(
    project_id: str,
    event_id: str = Path(..., title="The ID of the integration event to update"),
    event_data: IntegrationEventUpdate = None,
    current_user = Depends(get_current_user)
):
    """
    Update an integration event.
    """
    return await update_integration_event(event_id, event_data, project_id, current_user)


@router.delete("/{event_id}")
async def delete_existing_integration_event(
    project_id: str,
    event_id: str = Path(..., title="The ID of the integration event to delete"),
    current_user = Depends(get_current_user)
):
    """
    Delete an integration event.
    """
    return await delete_integration_event(event_id, project_id, current_user)


@router.post("/reorder")
async def reorder_events(
    project_id: str,
    event_order: List[str],
    current_user = Depends(get_current_user)
):
    """
    Reorder integration events based on the provided sequence of IDs.
    """
    return await reorder_integration_events(project_id, event_order, current_user)