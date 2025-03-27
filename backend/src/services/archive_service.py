# backend/src/services/archive_service.py
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

from src.utils.document_processor import extract_text_from_file, split_text
from src.ai_archive.embeddings import get_archive_retriever
from src.ai_archive.embeddings import add_document_to_vectordb, delete_document_embeddings, delete_all_project_embeddings
import shutil

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
    Upload a document to a project and process it for embedding.
    
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
        
        # Get original filename and extension
        original_filename = file.filename
        file_extension = os.path.splitext(original_filename)[1].lower()
        
        # Check if file type is supported (PDF, DOCX, PPT/PPTX)
        allowed_extensions = ['.pdf', '.docx', '.ppt', '.pptx']
        if file_extension not in allowed_extensions:
            raise ValueError(f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}")
        
        # Generate unique filename
        filename = f"{datetime.utcnow().isoformat().replace(':', '-')}_{original_filename}"
        filepath = os.path.join(upload_dir, filename)
        
        # Save file
        with open(filepath, 'wb') as buffer:
            buffer.write(await file.read())
        
        # Process the document for embedding
        # Extract text from the document
        document_text = extract_text_from_file(filepath)
        
        # If text was successfully extracted
        if document_text:
            # Split text into chunks with metadata
            document_chunks = split_text(document_text, original_filename)
            
            # Add document chunks to vector database
            embedding_success = add_document_to_vectordb(document_chunks)
            
            # Create document metadata
            document = {
                "_id": doc_id,
                "filename": original_filename,
                "stored_filename": filename,
                "path": filepath,
                "uploaded_at": datetime.utcnow().isoformat(),
                "embedded": embedding_success,
                "file_size": os.path.getsize(filepath),
                "file_type": file_extension[1:]  # Remove the dot
            }
        else:
            # If text extraction failed
            document = {
                "_id": doc_id,
                "filename": original_filename,
                "stored_filename": filename,
                "path": filepath,
                "uploaded_at": datetime.utcnow().isoformat(),
                "embedded": False,
                "file_size": os.path.getsize(filepath),
                "file_type": file_extension[1:]  # Remove the dot
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
        # Clean up the file if it was saved but an error occurred
        if 'filepath' in locals() and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
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
            
        # Delete embeddings from ChromaDB
        if document.get('embedded', False):
            delete_document_embeddings(document['filename'])

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

        # Get the filenames of all embedded documents
        embedded_filenames = [
            doc['filename'] for doc in project.get('documents', [])
            if doc.get('embedded', False)
        ]
        
        # Delete all embeddings for this project
        if embedded_filenames:
            delete_all_project_embeddings(embedded_filenames)

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

async def search_archive(query: str, num_results: int = 5) -> List[Dict]:
    """
    Search the archive for documents similar to the query.
    
    :param query: The text query to search for
    :param num_results: Number of results to return
    :return: List of document matches with metadata
    """
    try:
        # Get the retriever
        retriever = get_archive_retriever()
        if not retriever:
            return []
        
        # Search for similar documents
        docs = retriever.get_relevant_documents(query)
        
        # Format results
        results = []
        for doc in docs[:num_results]:
            results.append({
                "text": doc.page_content,
                "metadata": doc.metadata
            })
        
        return results
    except Exception as e:
        print(f"Error searching archive: {e}")
        return []