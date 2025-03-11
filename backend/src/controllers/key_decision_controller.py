from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from typing import List, Optional

from src.models.key_decision_models import (
    KeyDecisionCreate, 
    KeyDecisionUpdate, 
    KeyDecisionResponse
)
from src.services.key_decision_service import (
    create_key_decision,
    get_project_key_decisions,
    get_key_decision,
    update_key_decision,
    delete_key_decision,
    add_knowledge_gap_to_decision,
    remove_knowledge_gap_from_decision
)
from src.utils.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=KeyDecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_key_decision(
    project_id: str,
    decision_data: KeyDecisionCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new key decision.
    """
    return await create_key_decision(decision_data, project_id, current_user)


@router.get("/", response_model=List[KeyDecisionResponse])
async def read_project_key_decisions(
    project_id: str,
    integration_event_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get all key decisions for a project, optionally filtered by integration event.
    """
    return await get_project_key_decisions(project_id, integration_event_id, current_user)


@router.get("/{decision_id}", response_model=KeyDecisionResponse)
async def read_key_decision(
    project_id: str,
    decision_id: str = Path(..., title="The ID of the key decision to get"),
    current_user = Depends(get_current_user)
):
    """
    Get a specific key decision.
    """
    return await get_key_decision(decision_id, project_id, current_user)


@router.put("/{decision_id}", response_model=KeyDecisionResponse)
async def update_existing_key_decision(
    project_id: str,
    decision_id: str = Path(..., title="The ID of the key decision to update"),
    decision_data: KeyDecisionUpdate = None,
    current_user = Depends(get_current_user)
):
    """
    Update a key decision.
    """
    return await update_key_decision(decision_id, decision_data, project_id, current_user)


@router.delete("/{decision_id}")
async def delete_existing_key_decision(
    project_id: str,
    decision_id: str = Path(..., title="The ID of the key decision to delete"),
    current_user = Depends(get_current_user)
):
    """
    Delete a key decision.
    """
    return await delete_key_decision(decision_id, project_id, current_user)


@router.post("/{decision_id}/knowledge-gaps/{kg_id}")
async def add_kg_to_decision(
    project_id: str,
    decision_id: str = Path(..., title="The ID of the key decision"),
    kg_id: str = Path(..., title="The ID of the knowledge gap to add"),
    current_user = Depends(get_current_user)
):
    """
    Add a knowledge gap to a key decision.
    """
    return await add_knowledge_gap_to_decision(decision_id, kg_id, project_id, current_user)


@router.delete("/{decision_id}/knowledge-gaps/{kg_id}")
async def remove_kg_from_decision(
    project_id: str,
    decision_id: str = Path(..., title="The ID of the key decision"),
    kg_id: str = Path(..., title="The ID of the knowledge gap to remove"),
    current_user = Depends(get_current_user)
):
    """
    Remove a knowledge gap from a key decision.
    """
    return await remove_knowledge_gap_from_decision(decision_id, kg_id, project_id, current_user)