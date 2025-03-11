from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List

from src.models.project_models import ProjectCreate, ProjectUpdate, ProjectResponse
from src.services.project_service import create_project, get_projects, get_project, update_project, delete_project
from src.utils.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project_data: ProjectCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new project.
    """
    return await create_project(project_data, current_user)


@router.get("/", response_model=List[ProjectResponse])
async def read_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """
    Get all projects for the current user.
    """
    return await get_projects(current_user, skip, limit)


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get a specific project by ID.
    """
    return await get_project(project_id, current_user)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_existing_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update a project.
    """
    return await update_project(project_id, project_data, current_user)


@router.delete("/{project_id}")
async def delete_existing_project(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a project.
    """
    return await delete_project(project_id, current_user)