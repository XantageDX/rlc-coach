from bson import ObjectId
from typing import List, Dict
from datetime import datetime
import os

from src.models.archive_models import (
    ProjectCreate, ProjectResponse, 
    DocumentModel,
    convert_object_id
)
from src.utils.db import db

# Collection references
projects_collection = db["archive_projects"]

async def get_all_projects() -> List[dict]:
    """Get all projects with their documents."""
    projects = []
    
    # Get all projects
    project_cursor = projects_collection.find()
    for project_doc in project_cursor:
        # Convert ObjectId to string
        project_doc = convert_object_id(project_doc)
        projects.append(project_doc)
    
    return projects

async def create_project(project_data: ProjectCreate) -> ProjectResponse:
    """Create a new project."""
    try:
        # Convert project data to dictionary
        project_dict = project_data.model_dump()
        
        # Ensure documents list exists
        project_dict['documents'] = project_dict.get('documents', [])
        
        # Insert the project
        result = projects_collection.insert_one(project_dict)
        
        # Retrieve and convert the created project
        created_project = projects_collection.find_one({"_id": result.inserted_id})
        created_project = convert_object_id(created_project)
        
        return ProjectResponse(**created_project)
    except Exception as e:
        print(f"Exception in create_project: {e}")
        raise ValueError(f"Failed to create project: {e}")

async def upload_project_document(project_id: str, file) -> Dict:
    """
    Upload a document to a project.
    
    :param project_id: ID of the project to upload document to
    :param file: File object to upload
    :return: Document metadata
    """
    try:
        # Ensure projects directory exists
        upload_dir = os.path.join('uploads', 'projects', project_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique document ID
        doc_id = str(ObjectId())
        
        # Generate unique filename
        filename = f"{datetime.utcnow().isoformat().replace(':', '-')}_{file.filename}"
        filepath = os.path.join(upload_dir, filename)
        
        # Save file
        with open(filepath, 'wb') as buffer:
            buffer.write(await file.read())
        
        # Create document metadata
        document = {
            "_id": doc_id,
            "filename": file.filename,
            "stored_filename": filename,
            "path": filepath,
            "uploaded_at": datetime.utcnow().isoformat()
        }
        
        # Update project with document metadata
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$push": {"documents": document}}
        )
        
        if result.modified_count == 0:
            raise ValueError("Project not found or document not added")
        
        return document
    except Exception as e:
        print(f"Error uploading document: {e}")
        raise

async def delete_project_document(project_id: str, document_id: str) -> bool:
    """
    Delete a document from a project.
    
    :param project_id: ID of the project containing the document
    :param document_id: ID of the document to delete
    :return: True if successful, False otherwise
    """
    try:
        # First get the project to find the document
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise ValueError("Project not found")

        # Find the document in the project's documents
        document = next(
            (doc for doc in project.get('documents', []) if doc.get('_id') == document_id),
            None
        )
        
        if not document:
            return False

        # Delete the physical file if it exists
        if 'path' in document and os.path.exists(document['path']):
            try:
                os.remove(document['path'])
            except Exception as e:
                print(f"Warning: Could not delete physical file: {e}")

        # Remove the document from the project's documents array
        result = projects_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$pull": {"documents": {"_id": document_id}}}
        )

        return result.modified_count > 0

    except Exception as e:
        print(f"Error deleting document: {e}")
        raise

async def delete_project(project_id: str) -> bool:
    """
    Delete a project and all its associated documents.
    
    :param project_id: ID of the project to delete
    :return: True if successful, False otherwise
    """
    try:
        # First get the project to find all documents
        project = projects_collection.find_one({"_id": ObjectId(project_id)})
        if not project:
            return False

        # Delete all physical files associated with the project
        for document in project.get('documents', []):
            if 'path' in document and os.path.exists(document['path']):
                try:
                    os.remove(document['path'])
                except Exception as e:
                    print(f"Warning: Could not delete physical file: {e}")

        # Try to remove the project's upload directory
        upload_dir = os.path.join('uploads', 'projects', project_id)
        if os.path.exists(upload_dir):
            try:
                os.rmdir(upload_dir)
            except Exception as e:
                print(f"Warning: Could not remove project directory: {e}")

        # Delete the project from the database
        result = projects_collection.delete_one({"_id": ObjectId(project_id)})
        
        return result.deleted_count > 0

    except Exception as e:
        print(f"Error deleting project: {e}")
        raise