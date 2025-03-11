from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from typing import List, Optional

from src.models.knowledge_gap_models import (
    KnowledgeGapCreate, 
    KnowledgeGapUpdate, 
    KnowledgeGapResponse
)
from src.services.knowledge_gap_service import (
    create_knowledge_gap,
    get_project_knowledge_gaps,
    get_knowledge_gap,
    update_knowledge_gap,
    delete_knowledge_gap
)
from src.utils.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=KnowledgeGapResponse, status_code=status.HTTP_201_CREATED)
async def create_new_knowledge_gap(
    project_id: str,
    kg_data: KnowledgeGapCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new knowledge gap.
    """
    return await create_knowledge_gap(kg_data, project_id, current_user)


@router.get("/", response_model=List[KnowledgeGapResponse])
async def read_project_knowledge_gaps(
    project_id: str,
    key_decision_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get all knowledge gaps for a project, optionally filtered by key decision.
    """
    return await get_project_knowledge_gaps(project_id, key_decision_id, current_user)


@router.get("/{kg_id}", response_model=KnowledgeGapResponse)
async def read_knowledge_gap(
    project_id: str,
    kg_id: str = Path(..., title="The ID of the knowledge gap to get"),
    current_user = Depends(get_current_user)
):
    """
    Get a specific knowledge gap.
    """
    return await get_knowledge_gap(kg_id, project_id, current_user)


@router.put("/{kg_id}", response_model=KnowledgeGapResponse)
async def update_existing_knowledge_gap(
    project_id: str,
    kg_id: str = Path(..., title="The ID of the knowledge gap to update"),
    kg_data: KnowledgeGapUpdate = None,
    current_user = Depends(get_current_user)
):
    """
    Update a knowledge gap.
    """
    return await update_knowledge_gap(kg_id, kg_data, project_id, current_user)


@router.delete("/{kg_id}")
async def delete_existing_knowledge_gap(
    project_id: str,
    kg_id: str = Path(..., title="The ID of the knowledge gap to delete"),
    current_user = Depends(get_current_user)
):
    """
    Delete a knowledge gap.
    """
    return await delete_knowledge_gap(kg_id, project_id, current_user)