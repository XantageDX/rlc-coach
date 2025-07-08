#### PHASE 3.3 ####
"""
Archive Service - Rewritten for AWS Knowledge Base Integration (Sub-Phase 3.3).
Replaces shared ChromaDB with tenant-specific AWS Knowledge Bases.
Replaces shared S3 bucket with tenant-specific S3 buckets.
Maintains API compatibility while adding complete tenant isolation.
"""

from bson import ObjectId
from typing import List, Dict, Optional
from datetime import datetime
import os
import tempfile
import uuid

# AWS clients
import boto3
from botocore.exceptions import ClientError

# FastAPI
from fastapi import HTTPException, status

# Internal imports
from src.models.archive_models import (
    ProjectCreate, ProjectResponse, 
    DocumentModel,
    convert_object_id
)
from src.utils.db import db
from src.utils.document_processor import extract_text_from_file
from src.utils.cross_account_client import CrossAccountClient

# Collection references
projects_collection = db["archive_projects"]
tenants_collection = db["tenants"]

class TenantArchiveService:
    """Tenant-isolated archive service using AWS Knowledge Bases."""
    
    def __init__(self):
        self.projects_collection = projects_collection
        self.tenants_collection = tenants_collection

    async def get_all_projects(self, tenant_id: str) -> List[dict]:
        """
        Get all projects for a specific tenant (tenant-scoped).
        
        Args:
            tenant_id: Tenant ID to filter projects
            
        Returns:
            List of tenant's projects only
        """
        try:
            # Only get projects for this tenant
            project_cursor = self.projects_collection.find({"tenant_id": tenant_id})
            projects = []
            
            for project_doc in project_cursor:
                # Convert ObjectId to string
                project_doc = convert_object_id(project_doc)
                projects.append(project_doc)
            
            return projects
            
        except Exception as e:
            print(f"Error getting tenant projects: {str(e)}")
            return []

    async def create_project(self, project_data: ProjectCreate, tenant_id: str) -> ProjectResponse:
        """
        Create a new project for a specific tenant.
        
        Args:
            project_data: Project creation data
            tenant_id: Tenant ID for isolation
            
        Returns:
            Created project with tenant association
        """
        try:
            # Convert project data to dictionary and add tenant_id
            project_dict = project_data.model_dump()
            project_dict['tenant_id'] = tenant_id  # NEW: Tenant isolation
            project_dict['documents'] = project_dict.get('documents', [])
            project_dict['created_at'] = datetime.utcnow()
            project_dict['updated_at'] = datetime.utcnow()
            
            # Insert the project
            result = self.projects_collection.insert_one(project_dict)
            
            # Retrieve and convert the created project
            created_project = self.projects_collection.find_one({"_id": result.inserted_id})
            created_project = convert_object_id(created_project)
            
            return ProjectResponse(**created_project)
            
        except Exception as e:
            print(f"Exception in create_project: {e}")
            raise ValueError(f"Failed to create project: {e}")

    async def upload_project_document(self, project_id: str, file, tenant_id: str) -> Dict:
        """
        Upload document to tenant-specific S3 bucket and trigger Knowledge Base sync.
        
        Args:
            project_id: Project ID
            file: Uploaded file
            tenant_id: Tenant ID for isolation
            
        Returns:
            Upload result with document metadata
        """
        try:
            # Verify project belongs to tenant
            project = self.projects_collection.find_one({
                "_id": ObjectId(project_id), 
                "tenant_id": tenant_id
            })
            if not project:
                return {
                    "success": False,
                    "error": "Project not found or access denied"
                }
            
            # Get tenant info
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found"
                }
            
            aws_account_id = tenant.get("aws_account_id")
            s3_bucket = tenant.get("s3_bucket_name")
            
            if not aws_account_id or not s3_bucket:
                return {
                    "success": False,
                    "error": "Tenant AWS resources not configured"
                }
            
            # Generate unique document ID and filename
            doc_id = str(uuid.uuid4())
            original_filename = file.filename
            file_extension = os.path.splitext(original_filename)[1]
            stored_filename = f"{doc_id}{file_extension}"
            s3_key = f"documents/{stored_filename}"
            
            print(f"Uploading document {original_filename} to tenant {tenant['name']} S3 bucket: {s3_bucket}")
            
            # Get tenant's S3 client
            s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
            
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Upload to tenant's S3 bucket
            s3_client.put_object(
                Bucket=s3_bucket,
                Key=s3_key,
                Body=file_content,
                ContentType=file.content_type or "application/octet-stream",
                Metadata={
                    'original-filename': original_filename,
                    'tenant-id': tenant_id,
                    'project-id': project_id,
                    'uploaded-by': 'archive-service'
                }
            )
            
            # Create document metadata
            document = {
                "_id": doc_id,
                "filename": original_filename,
                "stored_filename": stored_filename,
                "s3_key": s3_key,
                "s3_bucket": s3_bucket,
                "aws_account_id": aws_account_id,  # NEW: For cross-account access
                "tenant_id": tenant_id,  # NEW: Tenant isolation
                "uploaded_at": datetime.utcnow().isoformat(),
                "file_size": file_size,
                "file_type": file_extension[1:] if file_extension else "unknown",
                "kb_indexed": False  # Will be updated after KB sync
            }
            
            # Add document to project
            self.projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$push": {"documents": document},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Trigger Knowledge Base sync for automatic indexing
            await self._trigger_knowledge_base_sync(tenant_id)
            
            print(f"Successfully uploaded document {original_filename} for tenant {tenant['name']}")
            
            return {
                "success": True,
                "message": "Document uploaded successfully",
                "document": document
            }
            
        except Exception as e:
            print(f"Error uploading document: {str(e)}")
            return {
                "success": False,
                "error": f"Upload failed: {str(e)}"
            }

    async def search_archive(self, query: str, tenant_id: str, num_results: int = 5) -> List[Dict]:
        """
        Search tenant's Knowledge Base for relevant documents.
        
        Args:
            query: Search query
            tenant_id: Tenant ID for isolation
            num_results: Maximum number of results
            
        Returns:
            List of search results from tenant's Knowledge Base only
        """
        try:
            # Get tenant info
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return []
            
            aws_account_id = tenant.get("aws_account_id")
            kb_id = tenant.get("bedrock_kb_id")
            
            if not aws_account_id or not kb_id:
                print(f"Tenant {tenant['name']} does not have Knowledge Base configured")
                return []
            
            print(f"Searching Knowledge Base {kb_id} for tenant {tenant['name']}")
            
            # Get Bedrock client for tenant account
            bedrock_client = CrossAccountClient.get_tenant_bedrock_client(aws_account_id)
            
            # Query the Knowledge Base
            response = bedrock_client.retrieve(
                knowledgeBaseId=kb_id,
                retrievalQuery={
                    'text': query
                },
                retrievalConfiguration={
                    'vectorSearchConfiguration': {
                        'numberOfResults': num_results
                    }
                }
            )
            
            # Format results for compatibility with existing API
            results = []
            for i, result in enumerate(response.get('retrievalResults', [])):
                content = result.get('content', {})
                metadata = result.get('metadata', {})
                location = result.get('location', {})
                
                formatted_result = {
                    "rank": i + 1,
                    "score": result.get('score', 0.0),
                    "content": content.get('text', ''),
                    "metadata": {
                        "source": location.get('s3Location', {}).get('uri', 'unknown'),
                        "tenant_id": tenant_id,  # Ensure tenant isolation
                        **metadata
                    },
                    "document_id": location.get('s3Location', {}).get('uri', '').split('/')[-1] if location.get('s3Location') else None
                }
                results.append(formatted_result)
            
            print(f"Found {len(results)} results for tenant {tenant['name']}")
            return results
            
        except Exception as e:
            print(f"Error searching Knowledge Base for tenant {tenant_id}: {str(e)}")
            return []

    async def delete_project_document(self, project_id: str, document_id: str, tenant_id: str) -> Dict:
        """
        Delete a document from tenant's project and S3 bucket.
        
        Args:
            project_id: Project ID
            document_id: Document ID to delete
            tenant_id: Tenant ID for isolation
            
        Returns:
            Deletion result
        """
        try:
            # Verify project belongs to tenant
            project = self.projects_collection.find_one({
                "_id": ObjectId(project_id), 
                "tenant_id": tenant_id
            })
            if not project:
                return {
                    "success": False,
                    "error": "Project not found or access denied"
                }
            
            # Find the document
            document = None
            for doc in project.get("documents", []):
                if doc.get("_id") == document_id:
                    document = doc
                    break
            
            if not document:
                return {
                    "success": False,
                    "error": "Document not found"
                }
            
            # Get tenant info for S3 deletion
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            aws_account_id = tenant.get("aws_account_id")
            s3_bucket = document.get("s3_bucket")
            s3_key = document.get("s3_key")
            
            if aws_account_id and s3_bucket and s3_key:
                try:
                    # Delete from tenant's S3 bucket
                    s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
                    s3_client.delete_object(Bucket=s3_bucket, Key=s3_key)
                    print(f"Deleted {s3_key} from S3 bucket {s3_bucket}")
                except Exception as e:
                    print(f"Warning: Could not delete from S3: {str(e)}")
            
            # Remove document from project
            self.projects_collection.update_one(
                {"_id": ObjectId(project_id)},
                {
                    "$pull": {"documents": {"_id": document_id}},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Trigger Knowledge Base sync to update index
            await self._trigger_knowledge_base_sync(tenant_id)
            
            return {
                "success": True,
                "message": "Document deleted successfully"
            }
            
        except Exception as e:
            print(f"Error deleting document: {str(e)}")
            return {
                "success": False,
                "error": f"Deletion failed: {str(e)}"
            }

    async def delete_project(self, project_id: str, tenant_id: str) -> Dict:
        """
        Delete entire project and all its documents for a tenant.
        
        Args:
            project_id: Project ID to delete
            tenant_id: Tenant ID for isolation
            
        Returns:
            Deletion result
        """
        try:
            # Verify project belongs to tenant
            project = self.projects_collection.find_one({
                "_id": ObjectId(project_id), 
                "tenant_id": tenant_id
            })
            if not project:
                return {
                    "success": False,
                    "error": "Project not found or access denied"
                }
            
            # Delete all documents first
            for document in project.get("documents", []):
                await self.delete_project_document(project_id, document.get("_id"), tenant_id)
            
            # Delete the project
            result = self.projects_collection.delete_one({
                "_id": ObjectId(project_id),
                "tenant_id": tenant_id  # Double-check tenant isolation
            })
            
            if result.deleted_count == 0:
                return {
                    "success": False,
                    "error": "Project deletion failed"
                }
            
            return {
                "success": True,
                "message": "Project deleted successfully"
            }
            
        except Exception as e:
            print(f"Error deleting project: {str(e)}")
            return {
                "success": False,
                "error": f"Project deletion failed: {str(e)}"
            }

    async def get_document_content(self, project_id: str, document_id: str, tenant_id: str) -> Optional[bytes]:
        """
        Get document content from tenant's S3 bucket.
        
        Args:
            project_id: Project ID
            document_id: Document ID
            tenant_id: Tenant ID for isolation
            
        Returns:
            Document content bytes or None if not found
        """
        try:
            # Verify project belongs to tenant
            project = self.projects_collection.find_one({
                "_id": ObjectId(project_id), 
                "tenant_id": tenant_id
            })
            if not project:
                return None
            
            # Find the document
            document = None
            for doc in project.get("documents", []):
                if doc.get("_id") == document_id:
                    document = doc
                    break
            
            if not document:
                return None
            
            # Get document from tenant's S3 bucket
            aws_account_id = document.get("aws_account_id")
            s3_bucket = document.get("s3_bucket")
            s3_key = document.get("s3_key")
            
            if not all([aws_account_id, s3_bucket, s3_key]):
                return None
            
            s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
            response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
            
            return response['Body'].read()
            
        except Exception as e:
            print(f"Error getting document content: {str(e)}")
            return None

    async def _trigger_knowledge_base_sync(self, tenant_id: str):
        """
        Trigger Knowledge Base sync to index new/updated documents.
        
        Args:
            tenant_id: Tenant ID
        """
        try:
            from src.services.knowledge_base_service import knowledge_base_service
            
            # Start async ingestion job
            result = await knowledge_base_service.start_ingestion_job(tenant_id)
            if result["success"]:
                print(f"Triggered Knowledge Base sync for tenant {tenant_id}")
            else:
                print(f"Failed to trigger KB sync for tenant {tenant_id}: {result['error']}")
                
        except Exception as e:
            print(f"Error triggering Knowledge Base sync: {str(e)}")

# Global service instance
tenant_archive_service = TenantArchiveService()

# Backwards compatibility functions (for existing controllers)
async def get_all_projects(tenant_id: str = None) -> List[dict]:
    """Backwards compatible function."""
    if not tenant_id:
        return []
    return await tenant_archive_service.get_all_projects(tenant_id)

async def create_project(project_data: ProjectCreate, tenant_id: str = None) -> ProjectResponse:
    """Backwards compatible function."""
    if not tenant_id:
        raise ValueError("Tenant ID required for project creation")
    return await tenant_archive_service.create_project(project_data, tenant_id)

async def upload_project_document(project_id: str, file, tenant_id: str = None) -> Dict:
    """Backwards compatible function."""
    if not tenant_id:
        return {"success": False, "error": "Tenant ID required"}
    return await tenant_archive_service.upload_project_document(project_id, file, tenant_id)

async def delete_project_document(project_id: str, document_id: str, tenant_id: str = None) -> Dict:
    """Backwards compatible function."""
    if not tenant_id:
        return {"success": False, "error": "Tenant ID required"}
    return await tenant_archive_service.delete_project_document(project_id, document_id, tenant_id)

async def delete_project(project_id: str, tenant_id: str = None) -> Dict:
    """Backwards compatible function."""
    if not tenant_id:
        return {"success": False, "error": "Tenant ID required"}
    return await tenant_archive_service.delete_project(project_id, tenant_id)

async def search_archive(query: str, num_results: int = 5, tenant_id: str = None) -> List[Dict]:
    """Backwards compatible function."""
    if not tenant_id:
        return []
    return await tenant_archive_service.search_archive(query, tenant_id, num_results)