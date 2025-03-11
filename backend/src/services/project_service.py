from fastapi import HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

from src.models.project_models import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectInDB
from src.utils.db import db
from src.utils.auth import get_current_user

# Load environment variables
load_dotenv()

# Get projects collection
projects_collection = db["projects"]


async def create_project(project_data: ProjectCreate, current_user) -> ProjectResponse:
    """Create a new project"""
    
    # Generate a unique ID for the project
    project_id = str(ObjectId())
    
    # Create project in database
    project_in_db = ProjectInDB(
        id=project_id,
        title=project_data.title,
        description=project_data.description,
        tenant_id=project_data.tenant_id,
        created_by=current_user.username,
        managers=[current_user.username],
        users=[current_user.username],
    )

    # Insert into DB
    result = projects_collection.insert_one(project_in_db.dict())
    
    if not result.acknowledged:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project",
        )
    
    # Return project
    return ProjectResponse(**project_in_db.dict())


async def get_projects(current_user, skip: int = 0, limit: int = 100) -> List[ProjectResponse]:
    """Get all projects for the current user"""
    
    # Find projects where user is either a manager or a user
    cursor = projects_collection.find(
        {"$or": [
            {"managers": current_user.username},
            {"users": current_user.username}
        ]}
    ).skip(skip).limit(limit)
    
    # Convert cursor to list (synchronous operation)
    projects = []
    for doc in cursor:  # Use regular for loop instead of async for
        projects.append(ProjectResponse(**doc))
    
    return projects


async def get_project(project_id: str, current_user) -> ProjectResponse:
    """Get a single project by ID"""
    
    # Find project by ID and check user access
    project = projects_collection.find_one({
        "id": project_id,
        "$or": [
            {"managers": current_user.username},
            {"users": current_user.username}
        ]
    })
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have access",
        )
    
    return ProjectResponse(**project)


async def update_project(project_id: str, project_data: ProjectUpdate, current_user) -> ProjectResponse:
    """Update a project"""
    
    # Find project by ID and check manager access
    project = projects_collection.find_one({
        "id": project_id,
        "managers": current_user.username
    })
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have permission to update it",
        )
    
    # Create update data
    update_data = {k: v for k, v in project_data.dict(exclude_unset=True).items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        
        # Update project in DB
        result = projects_collection.update_one(
            {"id": project_id},
            {"$set": update_data}
        )
        
        if not result.modified_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update project",
            )
    
    # Get updated project
    updated_project = projects_collection.find_one({"id": project_id})
    return ProjectResponse(**updated_project)


async def delete_project(project_id: str, current_user) -> dict:
    """Delete a project"""
    
    # Find project by ID and check manager access
    project = projects_collection.find_one({
        "id": project_id,
        "managers": current_user.username
    })
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or you don't have permission to delete it",
        )
    
    # Delete project from DB (or set status to deleted)
    result = projects_collection.update_one(
        {"id": project_id},
        {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
    )
    
    if not result.modified_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project",
        )
    
    return {"message": "Project successfully deleted"}