#### PHASE 3.3 ####
"""
Archive Controller - Updated for tenant isolation (Sub-Phase 3.3).
Routes now use tenant-specific Knowledge Bases and S3 buckets.
Maintains API compatibility while adding complete tenant isolation.
"""

import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from typing import List, Dict
from pydantic import BaseModel

# Internal imports
from src.models.archive_models import ProjectCreate, ProjectResponse
from src.services.archive_service import (
    tenant_archive_service,  # NEW: Use tenant-specific service
    # Backwards compatibility imports
    create_project, 
    get_all_projects, 
    upload_project_document,
    delete_project_document,
    delete_project,
    search_archive
)
from src.utils.auth import get_current_user

router = APIRouter()

class SearchQuery(BaseModel):
    query: str
    num_results: int = 5

@router.get("/projects", response_model=List[Dict])
async def list_projects(current_user = Depends(get_current_user)):
    """
    Get all projects in the archive for the current tenant.
    NOW TENANT-SCOPED: Only returns current tenant's projects.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to access archive"
            )
        
        # Get only tenant's projects
        projects = await get_all_projects(tenant_id=current_user.tenant_id)
        return projects
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving projects: {str(e)}"
        )

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def add_project(
    project_data: ProjectCreate, 
    current_user = Depends(get_current_user)
):
    """
    Create a new project in the archive for the current tenant.
    NOW TENANT-SCOPED: Project belongs to current tenant only.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to create projects"
            )
        
        # Create project for current tenant
        return await create_project(project_data, tenant_id=current_user.tenant_id)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.post("/projects/{project_id}/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Upload a document to a project.
    NOW TENANT-SCOPED: Documents go to tenant's S3 bucket and Knowledge Base.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to upload documents"
            )
        
        # Upload to tenant's resources
        result = await upload_project_document(
            project_id, 
            file, 
            tenant_id=current_user.tenant_id
        )
        
        if result["success"]:
            return {
                "message": result["message"],
                "document": result["document"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.get("/projects/{project_id}/documents/{document_id}/view", status_code=status.HTTP_200_OK)
async def view_document(
    project_id: str,
    document_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get a document file for viewing.
    NOW TENANT-SCOPED: Only retrieves documents from tenant's S3 bucket.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to view documents"
            )
        
        # Get document content from tenant's S3 bucket
        content = await tenant_archive_service.get_document_content(
            project_id, 
            document_id, 
            current_user.tenant_id
        )
        
        if content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access denied"
            )
        
        # Get document metadata for filename
        projects = await get_all_projects(tenant_id=current_user.tenant_id)
        document_filename = "document"
        
        for project in projects:
            if str(project.get("_id")) == project_id:
                for doc in project.get("documents", []):
                    if doc.get("_id") == document_id:
                        document_filename = doc.get("filename", "document")
                        break
                break
        
        # Return document as streaming response
        def iter_content():
            yield content
        
        return StreamingResponse(
            iter_content(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"inline; filename={document_filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving document: {str(e)}"
        )

@router.delete("/projects/{project_id}/documents/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    project_id: str,
    document_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a document from a project.
    NOW TENANT-SCOPED: Deletes from tenant's S3 bucket and updates Knowledge Base.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to delete documents"
            )
        
        # Delete from tenant's resources
        result = await delete_project_document(
            project_id, 
            document_id, 
            tenant_id=current_user.tenant_id
        )
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )

@router.delete("/projects/{project_id}", status_code=status.HTTP_200_OK)
async def remove_project(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a project and all its documents.
    NOW TENANT-SCOPED: Only deletes tenant's projects and documents.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to delete projects"
            )
        
        # Delete tenant's project
        result = await delete_project(project_id, tenant_id=current_user.tenant_id)
        
        if result["success"]:
            return {"message": result["message"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting project: {str(e)}"
        )

@router.post("/search", response_model=List[Dict])
async def search_documents(
    search_data: SearchQuery,
    current_user = Depends(get_current_user)
):
    """
    Search the archive for documents similar to the query.
    NOW TENANT-SCOPED: Searches only tenant's Knowledge Base.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant to search archive"
            )
        
        # Search only tenant's Knowledge Base
        results = await search_archive(
            search_data.query, 
            search_data.num_results, 
            tenant_id=current_user.tenant_id
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching archive: {str(e)}"
        )

# NEW: Tenant-specific archive status endpoint
@router.get("/status")
async def get_archive_status(current_user = Depends(get_current_user)):
    """
    Get archive status for current tenant.
    Shows Knowledge Base configuration and document count.
    """
    try:
        if not current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a tenant"
            )
        
        # Get tenant info
        from src.utils.db import db
        tenant = db["tenants"].find_one({"_id": current_user.tenant_id})
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get project count
        project_count = await tenant_archive_service.projects_collection.count_documents({
            "tenant_id": current_user.tenant_id
        })
        
        # Get total document count
        projects = await get_all_projects(tenant_id=current_user.tenant_id)
        document_count = sum(len(project.get("documents", [])) for project in projects)
        
        return {
            "tenant_name": tenant.get("name"),
            "knowledge_base_id": tenant.get("bedrock_kb_id"),
            "kb_status": tenant.get("kb_status"),
            "s3_bucket": tenant.get("s3_bucket_name"),
            "project_count": project_count,
            "document_count": document_count,
            "isolated": True,  # Always true now
            "archive_type": "knowledge_base"  # vs "chromadb" in old system
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting archive status: {str(e)}"
        )