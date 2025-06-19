# #### PHASE 3.2 ####
# """
# Enhanced tenant controller with AWS account creation, management, and Phase 3 resource setup.
# """

# from fastapi import APIRouter, Depends, HTTPException, status
# from typing import List
# from datetime import datetime
# from bson import ObjectId

# # Import models
# from src.models.tenant_aws_models import (
#     TenantCreateWithAWS, 
#     TenantResponseWithAWS, 
#     TenantStatusResponse,
#     AccountCreationRetryRequest,
#     ResourceSetupRequest,     # NEW Phase 3.1
#     ResourceSetupResponse,    # NEW Phase 3.1
#     ResourceVerificationResponse  # NEW Phase 3.1
# )
# from src.utils.auth import get_current_user
# from src.utils.db import db

# # Import services
# from src.services.tenant_aws_service import tenant_aws_service
# from src.services.tenant_resource_service import tenant_resource_service  # Phase 3.1
# from src.services.knowledge_base_service import knowledge_base_service      # NEW Phase 3.2

# router = APIRouter()

# # Database collections
# tenants_collection = db["tenants"]

# @router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
# async def create_tenant_with_aws_account(
#     tenant_data: TenantCreateWithAWS,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Create new tenant with automatic AWS account provisioning.
#     Only super_admin can create tenants.
#     """
#     # Check authorization
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can create tenants"
#         )
    
#     try:
#         # Check if tenant with same name already exists
#         existing_tenant = tenants_collection.find_one({"name": tenant_data.name})
#         if existing_tenant:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Tenant with this name already exists"
#             )
        
#         # Create tenant with AWS account
#         result = await tenant_aws_service.create_tenant_account(
#             tenant_name=tenant_data.name,
#             tenant_email=tenant_data.email,
#             created_by=current_user.email
#         )
        
#         if result["success"]:
#             return {
#                 "success": True,
#                 "message": "Tenant creation initiated",
#                 "tenant_id": result["tenant_id"],
#                 "aws_request_id": result["aws_request_id"]
#             }
#         else:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=result["message"]
#             )
            
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error creating tenant: {str(e)}"
#         )

# @router.get("/list", response_model=List[TenantResponseWithAWS])
# async def list_tenants(current_user = Depends(get_current_user)):
#     """
#     Get list of all tenants with AWS account information.
#     Only super_admin can view all tenants.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can view tenant list"
#         )
    
#     try:
#         tenants = list(tenants_collection.find({}))
        
#         tenant_list = []
#         for tenant in tenants:
#             # Determine status indicators
#             status = tenant.get("status", "UNKNOWN")
#             ready_for_setup = status == "SETTING_UP"
#             fully_ready = status == "READY"
            
#             tenant_response = TenantResponseWithAWS(
#                 id=str(tenant["_id"]),
#                 name=tenant["name"],
#                 email=tenant["email"],
#                 description=tenant.get("description", ""),
#                 status=status,
#                 aws_account_id=tenant.get("aws_account_id"),
#                 aws_account_email=tenant.get("aws_account_email"),
#                 s3_bucket_name=tenant.get("s3_bucket_name"),      # NEW Phase 3.1
#                 resources_setup=tenant.get("resources_setup", False),  # NEW Phase 3.1
#                 bedrock_kb_id=tenant.get("bedrock_kb_id"),       # NEW Phase 3.2
#                 kb_status=tenant.get("kb_status"),               # NEW Phase 3.2
#                 token_limit_millions=tenant.get("token_limit_millions", 20),
#                 max_users=tenant.get("max_users", 100),
#                 created_by=tenant["created_by"],
#                 created_at=tenant["created_at"].isoformat(),
#                 updated_at=tenant["updated_at"].isoformat(),
#                 ready_for_setup=ready_for_setup,     # NEW
#                 fully_ready=fully_ready              # NEW
#             )
#             tenant_list.append(tenant_response)
        
#         return tenant_list
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrieving tenants: {str(e)}"
#         )

# @router.get("/{tenant_id}/status", response_model=TenantStatusResponse)
# async def get_tenant_status(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Get current status of tenant AWS account and resources.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can check tenant status"
#         )
    
#     try:
#         result = await tenant_aws_service.get_tenant_status(tenant_id)
        
#         if result["success"]:
#             return TenantStatusResponse(
#                 success=True,
#                 status=result["status"],
#                 message=f"Tenant status: {result['status']}",
#                 aws_account_id=result.get("aws_account_id"),
#                 s3_bucket_name=result.get("s3_bucket_name"),      # NEW Phase 3.1
#                 resources_setup=result.get("resources_setup", False),  # NEW Phase 3.1
#                 ready_for_setup=result.get("ready_for_setup", False),
#                 fully_ready=result.get("fully_ready", False),
#                 bedrock_kb_id=result.get("bedrock_kb_id"),       # NEW Phase 3.2
#                 kb_status=result.get("kb_status")                # NEW Phase 3.2
#             )
#         else:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail=result["error"]
#             )
            
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error checking tenant status: {str(e)}"
#         )

# @router.post("/{tenant_id}/retry", response_model=dict)
# async def retry_tenant_creation(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Retry failed tenant account creation.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can retry tenant creation"
#         )
    
#     try:
#         result = await tenant_aws_service.retry_tenant_creation(tenant_id)
        
#         if result["success"]:
#             return {
#                 "success": True,
#                 "message": result["message"]
#             }
#         else:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail=result["error"]
#             )
            
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrying tenant creation: {str(e)}"
#         )

# # NEW Phase 3.1 Endpoints
# @router.post("/{tenant_id}/setup-resources", response_model=ResourceSetupResponse)
# async def setup_tenant_resources(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     NEW: Set up AWS resources (S3, IAM) in tenant account.
#     Phase 3.1 endpoint for manual resource setup if automatic setup fails.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can setup tenant resources"
#         )
    
#     try:
#         result = await tenant_resource_service.setup_tenant_resources(tenant_id)
        
#         if result["success"]:
#             return ResourceSetupResponse(
#                 success=True,
#                 message=result["message"],
#                 resources=result.get("resources")
#             )
#         else:
#             return ResourceSetupResponse(
#                 success=False,
#                 message=result.get("message", "Resource setup failed"),
#                 error=result["error"]
#             )
            
#     except Exception as e:
#         return ResourceSetupResponse(
#             success=False,
#             message="Resource setup error",
#             error=str(e)
#         )

# @router.get("/{tenant_id}/verify-resources", response_model=ResourceVerificationResponse)
# async def verify_tenant_resources(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     NEW: Verify that all tenant resources are properly configured.
#     Phase 3.1 endpoint for troubleshooting resource setup issues.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can verify tenant resources"
#         )
    
#     try:
#         result = await tenant_resource_service.verify_tenant_resources(tenant_id)
        
#         return ResourceVerificationResponse(
#             success=result["success"],
#             verification=result.get("verification"),
#             error=result.get("error")
#         )
        
#     except Exception as e:
#         return ResourceVerificationResponse(
#             success=False,
#             error=str(e)
#         )

# # NEW Phase 3.2 Endpoints - Knowledge Base Management
# @router.post("/{tenant_id}/create-knowledge-base", response_model=dict)
# async def create_tenant_knowledge_base(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     NEW: Create Bedrock Knowledge Base for tenant.
#     Phase 3.2 endpoint for Knowledge Base creation with Cohere embeddings.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can create Knowledge Bases"
#         )
    
#     try:
#         result = await knowledge_base_service.create_knowledge_base(tenant_id)
        
#         if result["success"]:
#             return {
#                 "success": True,
#                 "message": result["message"],
#                 "knowledge_base_id": result["knowledge_base_id"],
#                 "status": result["status"]
#             }
#         else:
#             return {
#                 "success": False,
#                 "message": result.get("message", "Knowledge Base creation failed"),
#                 "error": result["error"]
#             }
            
#     except Exception as e:
#         return {
#             "success": False,
#             "message": "Knowledge Base creation error",
#             "error": str(e)
#         }

# @router.get("/{tenant_id}/knowledge-base/status", response_model=dict)
# async def get_knowledge_base_status(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     NEW: Get Knowledge Base status for tenant.
#     Phase 3.2 endpoint for monitoring KB creation and sync status.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can check Knowledge Base status"
#         )
    
#     try:
#         result = await knowledge_base_service.get_knowledge_base_status(tenant_id)
#         return result
        
#     except Exception as e:
#         return {
#             "success": False,
#             "error": str(e)
#         }

# @router.post("/{tenant_id}/knowledge-base/sync", response_model=dict)
# async def start_knowledge_base_sync(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     NEW: Start Knowledge Base document ingestion/sync.
#     Phase 3.2 endpoint for triggering document indexing.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can sync Knowledge Bases"
#         )
    
#     try:
#         result = await knowledge_base_service.start_ingestion_job(tenant_id)
#         return result
        
#     except Exception as e:
#         return {
#             "success": False,
#             "error": str(e)
#         }

# @router.post("/{tenant_id}/setup-complete-resources", response_model=ResourceSetupResponse)
# async def setup_complete_tenant_resources(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     NEW: Set up complete tenant resources including Knowledge Base.
#     Phase 3.2 endpoint that combines S3/IAM setup with KB creation.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can setup complete tenant resources"
#         )
    
#     try:
#         result = await tenant_resource_service.setup_tenant_resources_with_kb(tenant_id)
        
#         if result["success"]:
#             return ResourceSetupResponse(
#                 success=True,
#                 message=result["message"],
#                 resources=result.get("resources")
#             )
#         else:
#             return ResourceSetupResponse(
#                 success=False,
#                 message=result.get("message", "Complete resource setup failed"),
#                 error=result["error"]
#             )
            
#     except Exception as e:
#         return ResourceSetupResponse(
#             success=False,
#             message="Complete resource setup error",
#             error=str(e)
#         )

# @router.get("/{tenant_id}/details", response_model=TenantResponseWithAWS)
# async def get_tenant_details(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Get detailed information about a specific tenant.
#     Enhanced with Phase 3 resource information.
#     """
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can view tenant details"
#         )
    
#     try:
#         tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
#         if not tenant:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Tenant not found"
#             )
        
#         # Determine status indicators
#         status = tenant.get("status", "UNKNOWN")
#         ready_for_setup = status == "SETTING_UP"
#         fully_ready = status == "READY"
        
#         return TenantResponseWithAWS(
#             id=str(tenant["_id"]),
#             name=tenant["name"],
#             email=tenant["email"],
#             description=tenant.get("description", ""),
#             status=status,
#             aws_account_id=tenant.get("aws_account_id"),
#             aws_account_email=tenant.get("aws_account_email"),
#             s3_bucket_name=tenant.get("s3_bucket_name"),         # NEW Phase 3.1
#             resources_setup=tenant.get("resources_setup", False),     # NEW Phase 3.1
#             bedrock_kb_id=tenant.get("bedrock_kb_id"),          # NEW Phase 3.2
#             kb_status=tenant.get("kb_status"),                  # NEW Phase 3.2
#             token_limit_millions=tenant.get("token_limit_millions", 20),
#             max_users=tenant.get("max_users", 100),
#             created_by=tenant["created_by"],
#             created_at=tenant["created_at"].isoformat(),
#             updated_at=tenant["updated_at"].isoformat(),
#             ready_for_setup=ready_for_setup,
#             fully_ready=fully_ready
#         )
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrieving tenant details: {str(e)}"
#         )

#### PHASE 4.2 ####
"""
Enhanced tenant controller with AWS account creation, management, and Phase 3 resource setup.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId

# Import models
from src.models.tenant_aws_models import (
    TenantCreateWithAWS, 
    TenantResponseWithAWS, 
    TenantStatusResponse,
    AccountCreationRetryRequest,
    ResourceSetupRequest,     # NEW Phase 3.1
    ResourceSetupResponse,    # NEW Phase 3.1
    ResourceVerificationResponse  # NEW Phase 3.1
)
from src.utils.auth import get_current_user
from src.utils.db import db

# Import services
from src.services.tenant_aws_service import tenant_aws_service
from src.services.tenant_resource_service import tenant_resource_service  # Phase 3.1
from src.services.knowledge_base_service import knowledge_base_service      # NEW Phase 3.2

router = APIRouter()

# Database collections
tenants_collection = db["tenants"]

@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_tenant_with_aws_account(
    tenant_data: TenantCreateWithAWS,
    current_user = Depends(get_current_user)
):
    """
    Create new tenant with automatic AWS account provisioning.
    Only super_admin can create tenants.
    """
    # Check authorization
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can create tenants"
        )
    
    try:
        # Check if tenant with same name already exists
        existing_tenant = tenants_collection.find_one({"name": tenant_data.name})
        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this name already exists"
            )
        
        # Create tenant with AWS account
        result = await tenant_aws_service.create_tenant_account(
            tenant_name=tenant_data.name,
            tenant_email=tenant_data.email,
            #created_by=current_user.email
            created_by=current_user.username
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Tenant creation initiated",
                "tenant_id": result["tenant_id"],
                "aws_request_id": result["aws_request_id"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )

@router.get("/list", response_model=List[TenantResponseWithAWS])
async def list_tenants(current_user = Depends(get_current_user)):
    """
    Get list of all tenants with AWS account information.
    Only super_admin can view all tenants.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view tenant list"
        )
    
    try:
        tenants = list(tenants_collection.find({}))
        
        tenant_list = []
        for tenant in tenants:
            # Determine status indicators
            status = tenant.get("status", "UNKNOWN")
            ready_for_setup = status == "SETTING_UP"
            fully_ready = status == "READY"
            
            tenant_response = TenantResponseWithAWS(
                id=str(tenant["_id"]),
                name=tenant["name"],
                email=tenant["email"],
                description=tenant.get("description", ""),
                status=status,
                aws_account_id=tenant.get("aws_account_id"),
                aws_account_email=tenant.get("aws_account_email"),
                s3_bucket_name=tenant.get("s3_bucket_name"),      # NEW Phase 3.1
                resources_setup=tenant.get("resources_setup", False),  # NEW Phase 3.1
                bedrock_kb_id=tenant.get("bedrock_kb_id"),       # NEW Phase 3.2
                kb_status=tenant.get("kb_status"),               # NEW Phase 3.2
                token_limit_millions=tenant.get("token_limit_millions", 20),
                max_users=tenant.get("max_users", 100),
                created_by=tenant["created_by"],
                created_at=tenant["created_at"].isoformat(),
                updated_at=tenant["updated_at"].isoformat(),
                ready_for_setup=ready_for_setup,     # NEW
                fully_ready=fully_ready              # NEW
            )
            tenant_list.append(tenant_response)
        
        return tenant_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenants: {str(e)}"
        )

@router.get("/{tenant_id}/status", response_model=TenantStatusResponse)
async def get_tenant_status(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get current status of tenant AWS account and resources.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can check tenant status"
        )
    
    try:
        result = await tenant_aws_service.get_tenant_status(tenant_id)
        
        if result["success"]:
            return TenantStatusResponse(
                success=True,
                status=result["status"],
                message=f"Tenant status: {result['status']}",
                aws_account_id=result.get("aws_account_id"),
                s3_bucket_name=result.get("s3_bucket_name"),      # NEW Phase 3.1
                resources_setup=result.get("resources_setup", False),  # NEW Phase 3.1
                ready_for_setup=result.get("ready_for_setup", False),
                fully_ready=result.get("fully_ready", False),
                bedrock_kb_id=result.get("bedrock_kb_id"),       # NEW Phase 3.2
                kb_status=result.get("kb_status")                # NEW Phase 3.2
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking tenant status: {str(e)}"
        )

@router.post("/{tenant_id}/retry", response_model=dict)
async def retry_tenant_creation(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    Retry failed tenant account creation.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can retry tenant creation"
        )
    
    try:
        result = await tenant_aws_service.retry_tenant_creation(tenant_id)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"]
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
            detail=f"Error retrying tenant creation: {str(e)}"
        )

# NEW Phase 3.1 Endpoints
@router.post("/{tenant_id}/setup-resources", response_model=ResourceSetupResponse)
async def setup_tenant_resources(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    NEW: Set up AWS resources (S3, IAM) in tenant account.
    Phase 3.1 endpoint for manual resource setup if automatic setup fails.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can setup tenant resources"
        )
    
    try:
        result = await tenant_resource_service.setup_tenant_resources(tenant_id)
        
        if result["success"]:
            return ResourceSetupResponse(
                success=True,
                message=result["message"],
                resources=result.get("resources")
            )
        else:
            return ResourceSetupResponse(
                success=False,
                message=result.get("message", "Resource setup failed"),
                error=result["error"]
            )
            
    except Exception as e:
        return ResourceSetupResponse(
            success=False,
            message="Resource setup error",
            error=str(e)
        )

@router.get("/{tenant_id}/verify-resources", response_model=ResourceVerificationResponse)
async def verify_tenant_resources(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    NEW: Verify that all tenant resources are properly configured.
    Phase 3.1 endpoint for troubleshooting resource setup issues.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can verify tenant resources"
        )
    
    try:
        result = await tenant_resource_service.verify_tenant_resources(tenant_id)
        
        return ResourceVerificationResponse(
            success=result["success"],
            verification=result.get("verification"),
            error=result.get("error")
        )
        
    except Exception as e:
        return ResourceVerificationResponse(
            success=False,
            error=str(e)
        )

# NEW Phase 3.2 Endpoints - Knowledge Base Management
@router.post("/{tenant_id}/create-knowledge-base", response_model=dict)
async def create_tenant_knowledge_base(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    NEW: Create Bedrock Knowledge Base for tenant.
    Phase 3.2 endpoint for Knowledge Base creation with Cohere embeddings.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can create Knowledge Bases"
        )
    
    try:
        result = await knowledge_base_service.create_knowledge_base(tenant_id)
        
        if result["success"]:
            return {
                "success": True,
                "message": result["message"],
                "knowledge_base_id": result["knowledge_base_id"],
                "status": result["status"]
            }
        else:
            return {
                "success": False,
                "message": result.get("message", "Knowledge Base creation failed"),
                "error": result["error"]
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": "Knowledge Base creation error",
            "error": str(e)
        }

@router.get("/{tenant_id}/knowledge-base/status", response_model=dict)
async def get_knowledge_base_status(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    NEW: Get Knowledge Base status for tenant.
    Phase 3.2 endpoint for monitoring KB creation and sync status.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can check Knowledge Base status"
        )
    
    try:
        result = await knowledge_base_service.get_knowledge_base_status(tenant_id)
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/{tenant_id}/knowledge-base/sync", response_model=dict)
async def start_knowledge_base_sync(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    NEW: Start Knowledge Base document ingestion/sync.
    Phase 3.2 endpoint for triggering document indexing.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can sync Knowledge Bases"
        )
    
    try:
        result = await knowledge_base_service.start_ingestion_job(tenant_id)
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/{tenant_id}/setup-complete-resources", response_model=ResourceSetupResponse)
async def setup_complete_tenant_resources(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    NEW: Set up complete tenant resources including Knowledge Base.
    Phase 3.2 endpoint that combines S3/IAM setup with KB creation.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can setup complete tenant resources"
        )
    
    try:
        result = await tenant_resource_service.setup_tenant_resources_with_kb(tenant_id)
        
        if result["success"]:
            return ResourceSetupResponse(
                success=True,
                message=result["message"],
                resources=result.get("resources")
            )
        else:
            return ResourceSetupResponse(
                success=False,
                message=result.get("message", "Complete resource setup failed"),
                error=result["error"]
            )
            
    except Exception as e:
        return ResourceSetupResponse(
            success=False,
            message="Complete resource setup error",
            error=str(e)
        )

@router.get("/{tenant_id}/details", response_model=TenantResponseWithAWS)
async def get_tenant_details(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get detailed information about a specific tenant.
    Enhanced with Phase 3 resource information.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view tenant details"
        )
    
    try:
        tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Determine status indicators
        status = tenant.get("status", "UNKNOWN")
        ready_for_setup = status == "SETTING_UP"
        fully_ready = status == "READY"
        
        return TenantResponseWithAWS(
            id=str(tenant["_id"]),
            name=tenant["name"],
            email=tenant["email"],
            description=tenant.get("description", ""),
            status=status,
            aws_account_id=tenant.get("aws_account_id"),
            aws_account_email=tenant.get("aws_account_email"),
            s3_bucket_name=tenant.get("s3_bucket_name"),         # NEW Phase 3.1
            resources_setup=tenant.get("resources_setup", False),     # NEW Phase 3.1
            bedrock_kb_id=tenant.get("bedrock_kb_id"),          # NEW Phase 3.2
            kb_status=tenant.get("kb_status"),                  # NEW Phase 3.2
            token_limit_millions=tenant.get("token_limit_millions", 20),
            max_users=tenant.get("max_users", 100),
            created_by=tenant["created_by"],
            created_at=tenant["created_at"].isoformat(),
            updated_at=tenant["updated_at"].isoformat(),
            ready_for_setup=ready_for_setup,
            fully_ready=fully_ready
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant details: {str(e)}"
        )

@router.get("/debug/{tenant_id}")
async def debug_tenant_status(tenant_id: str):
    """DEBUG: Test the status method directly"""
    try:
        # Test database lookup
        tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
        if not tenant:
            return {"error": "Tenant not found in database", "tenant_id": tenant_id}
        
        # Test service method
        result = await tenant_aws_service.get_tenant_status(tenant_id)
        
        return {
            "tenant_from_db": {
                "name": tenant.get("name"),
                "status": tenant.get("status"),
                "aws_request_id": tenant.get("aws_request_id"),
                "aws_account_id": tenant.get("aws_account_id")
            },
            "service_result": result
        }
    except Exception as e:
        return {"error": str(e), "type": str(type(e))}