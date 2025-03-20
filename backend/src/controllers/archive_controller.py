# backend/src/controllers/archive_controller.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from typing import List, Optional
from src.models.archive_models import ProjectCreate, ProjectResponse, KeyDecisionCreate, KeyDecisionResponse, KnowledgeGapCreate, KnowledgeGapResponse
from src.services.archive_service import (
    create_project, get_all_projects, create_key_decision, create_knowledge_gap,
    delete_project, delete_key_decision, delete_knowledge_gap
)
from src.utils.auth import get_current_user

router = APIRouter()

# Project routes
@router.get("/projects", response_model=List[dict])
async def get_projects(current_user = Depends(get_current_user)):
    """
    Get all projects in the archive.
    """
    return await get_all_projects()

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(project_data: ProjectCreate, current_user = Depends(get_current_user)):
    """
    Create a new project in the archive.
    """
    print(f"Creating project with data: {project_data}")
    try:
        result = await create_project(project_data)
        print(f"Project created successfully: {result}")
        return result
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_endpoint(project_id: str, current_user = Depends(get_current_user)):
    """
    Delete a project and all its key decisions and knowledge gaps.
    """
    success = await delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Key Decision routes
@router.post("/projects/{project_id}/key-decisions", response_model=KeyDecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_key_decision(project_id: str, kd_data: KeyDecisionCreate, current_user = Depends(get_current_user)):
    """
    Create a new key decision for a project.
    """
    return await create_key_decision(project_id, kd_data)

@router.delete("/key-decisions/{kd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key_decision_endpoint(kd_id: str, current_user = Depends(get_current_user)):
    """
    Delete a key decision and all its knowledge gaps.
    """
    success = await delete_key_decision(kd_id)
    if not success:
        raise HTTPException(status_code=404, detail="Key Decision not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Knowledge Gap routes
@router.post("/key-decisions/{kd_id}/knowledge-gaps", response_model=KnowledgeGapResponse, status_code=status.HTTP_201_CREATED)
async def create_new_knowledge_gap(kd_id: str, kg_data: KnowledgeGapCreate, current_user = Depends(get_current_user)):
    """
    Create a new knowledge gap for a key decision.
    """
    return await create_knowledge_gap(kd_id, kg_data)

@router.delete("/knowledge-gaps/{kg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_gap_endpoint(kg_id: str, current_user = Depends(get_current_user)):
    """
    Delete a knowledge gap.
    """
    success = await delete_knowledge_gap(kg_id)
    if not success:
        raise HTTPException(status_code=404, detail="Knowledge Gap not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Handle OPTIONS requests for CORS
@router.options("/{path:path}")
async def options_route(path: str):
    """
    Handle OPTIONS requests for CORS preflight.
    """
    return Response(status_code=200)