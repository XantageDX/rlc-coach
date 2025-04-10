from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import FileResponse
import os
from pydantic import BaseModel
from typing import List, Dict
from src.models.archive_models import ProjectCreate, ProjectResponse
from src.services.archive_service import (
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

# @router.get("/projects/{project_id}/documents/{document_id}/view", status_code=status.HTTP_200_OK)
# async def view_document(
#     project_id: str,
#     document_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Get a document file for viewing.
#     """
#     try:
#         # Find the project
#         project = next((p for p in await get_all_projects() if p.get("_id") == project_id), None)
#         if not project:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Project not found"
#             )
        
#         # Find the document in the project
#         document = next((doc for doc in project.get('documents', []) if doc.get('_id') == document_id), None)
#         if not document:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Document not found"
#             )
            
#         # Get the file path
#         file_path = document.get('path')
#         if not file_path or not os.path.exists(file_path):
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="File not found on server"
#             )
        
#         # Return the file
#         return FileResponse(
#             path=file_path, 
#             filename=document.get('filename'),
#             media_type="application/octet-stream"  # Let the browser determine the file type
#         )
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrieving document: {str(e)}"
#         )
@router.get("/projects/{project_id}/documents/{document_id}/view", status_code=status.HTTP_200_OK)
async def view_document(
    project_id: str,
    document_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get a document file for viewing.
    """
    try:
        # Find the project
        project = next((p for p in await get_all_projects() if p.get("_id") == project_id), None)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Find the document in the project
        document = next((doc for doc in project.get('documents', []) if doc.get('_id') == document_id), None)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
            
        # Get the file path
        file_path = document.get('path')
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on server"
            )
        
        # Return the file with appropriate headers for download
        return FileResponse(
            path=file_path, 
            filename=document.get('filename'),
            media_type="application/octet-stream"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving document: {str(e)}"
        )

@router.post("/search", response_model=List[Dict])
async def search_documents(
    search_data: SearchQuery,
    current_user = Depends(get_current_user)
):
    """
    Search the archive for documents similar to the query.
    """
    try:
        results = await search_archive(search_data.query, search_data.num_results)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching archive: {str(e)}"
        )

@router.get("/projects", response_model=List[Dict])
async def list_projects(current_user = Depends(get_current_user)):
    """
    Get all projects in the archive.
    """
    return await get_all_projects()

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def add_project(
    project_data: ProjectCreate, 
    current_user = Depends(get_current_user)
):
    """
    Create a new project in the archive.
    """
    try:
        return await create_project(project_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(e)
        )

@router.delete("/projects/{project_id}", status_code=status.HTTP_200_OK)
async def remove_project(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a project and all its documents.
    """
    try:
        success = await delete_project(project_id)
        if success:
            return {"message": "Project deleted successfully"}
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting project"
        )

@router.post("/projects/{project_id}/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: str, 
    document: UploadFile = File(...), 
    current_user = Depends(get_current_user)
):
    """
    Upload a document to a specific project.
    """
    try:
        uploaded_doc = await upload_project_document(project_id, document)
        return uploaded_doc
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Error uploading document"
        )

@router.delete("/projects/{project_id}/documents/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    project_id: str,
    document_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a document from a specific project.
    """
    try:
        success = await delete_project_document(project_id, document_id)
        if success:
            return {"message": "Document deleted successfully"}
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting document"
        )