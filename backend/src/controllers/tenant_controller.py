# from fastapi import APIRouter, Depends, HTTPException, status
# from typing import List, Dict
# from pydantic import BaseModel
# from datetime import datetime
# from src.utils.auth import get_current_user
# from src.utils.db import db
# from bson import ObjectId

# router = APIRouter()

# class TenantCreate(BaseModel):
#     name: str
#     email: str
#     description: str = ""

# class TenantResponse(BaseModel):
#     id: str
#     name: str
#     email: str
#     status: str = "ACTIVE"
#     created_at: str
#     updated_at: str

# @router.post("/create", status_code=status.HTTP_201_CREATED)
# async def create_tenant(
#     tenant_data: TenantCreate,
#     current_user = Depends(get_current_user)
# ):
#     """Create new tenant organization (super_admin only)"""
    
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can create tenants"
#         )
    
#     try:
#         tenants_collection = db["tenants"]
        
#         # Check if tenant already exists
#         existing = tenants_collection.find_one({"email": tenant_data.email})
#         if existing:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Tenant with this email already exists"
#             )
        
#         # Create tenant record
#         tenant_record = {
#             "name": tenant_data.name,
#             "email": tenant_data.email,
#             "description": tenant_data.description,
#             "status": "ACTIVE",
#             "token_limit_millions": 20,  # Default 20M tokens
#             "max_users": 100,            # Default 100 users
#             "created_by": current_user.username,
#             "created_at": datetime.utcnow(),
#             "updated_at": datetime.utcnow()
#         }
        
#         result = tenants_collection.insert_one(tenant_record)
        
#         return {
#             "message": "Tenant created successfully",
#             "tenant_id": str(result.inserted_id),
#             "tenant_name": tenant_data.name
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error creating tenant: {str(e)}"
#         )

# @router.get("/list")
# async def list_tenants(current_user = Depends(get_current_user)):
#     """List all tenant organizations"""
    
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can list tenants"
#         )
    
#     try:
#         tenants_collection = db["tenants"]
#         tenants = list(tenants_collection.find({}, {
#             "_id": 1, 
#             "name": 1, 
#             "email": 1, 
#             "status": 1,
#             "created_at": 1,
#             "updated_at": 1
#         }))
        
#         # Convert ObjectId to string
#         for tenant in tenants:
#             tenant["id"] = str(tenant.pop("_id"))
#             tenant["created_at"] = tenant["created_at"].isoformat() if tenant.get("created_at") else None
#             tenant["updated_at"] = tenant["updated_at"].isoformat() if tenant.get("updated_at") else None
        
#         return tenants
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrieving tenants: {str(e)}"
#         )

# @router.delete("/{tenant_id}")
# async def delete_tenant(
#     tenant_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """Delete a tenant organization"""
    
#     if current_user.role != "super_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only super admins can delete tenants"
#         )
    
#     try:
#         tenants_collection = db["tenants"]
#         users_collection = db["users"]
        
#         # Check if tenant exists
#         tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
#         if not tenant:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Tenant not found"
#             )
        
#         # Check if tenant has users
#         user_count = users_collection.count_documents({"tenant_id": tenant_id})
#         if user_count > 0:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail=f"Cannot delete tenant: {user_count} users still assigned to this tenant"
#             )
        
#         # Delete tenant
#         result = tenants_collection.delete_one({"_id": ObjectId(tenant_id)})
        
#         if result.deleted_count == 0:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Tenant not found"
#             )
        
#         return {"message": f"Tenant '{tenant['name']}' deleted successfully"}
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error deleting tenant: {str(e)}"
#         )

"""
Enhanced tenant controller with AWS account creation and management.
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
    AccountCreationRetryRequest
)
from src.utils.auth import get_current_user
from src.utils.db import db

# Import services
from src.services.tenant_aws_service import tenant_aws_service

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
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can create tenants"
        )
    
    try:
        # Check if tenant already exists
        existing = tenants_collection.find_one({"email": tenant_data.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this email already exists"
            )
        
        # Create AWS account and tenant record
        result = await tenant_aws_service.create_tenant_account(
            tenant_name=tenant_data.name,
            tenant_email=tenant_data.email,
            created_by=current_user.username
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )
        
        return {
            "message": "Tenant creation initiated successfully",
            "tenant_id": result["tenant_id"],
            "aws_request_id": result["aws_request_id"],
            "status": result["status"],
            "estimated_completion": "2-5 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )

@router.get("/list", response_model=List[TenantResponseWithAWS])
async def list_tenants_with_aws_info(current_user = Depends(get_current_user)):
    """List all tenant organizations with AWS account information."""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can list tenants"
        )
    
    try:
        tenants = list(tenants_collection.find({}))
        
        # Convert ObjectId to string and format dates
        tenant_list = []
        for tenant in tenants:
            tenant_response = TenantResponseWithAWS(
                id=str(tenant["_id"]),
                name=tenant["name"],
                email=tenant["email"],
                description=tenant.get("description", ""),
                status=tenant.get("status", "UNKNOWN"),
                aws_account_id=tenant.get("aws_account_id"),
                aws_account_email=tenant.get("aws_account_email"),
                bedrock_kb_id=tenant.get("bedrock_kb_id"),
                s3_bucket=tenant.get("s3_bucket"),
                resources_setup=tenant.get("resources_setup", False),
                token_limit_millions=tenant.get("token_limit_millions", 20),
                max_users=tenant.get("max_users", 100),
                created_by=tenant.get("created_by", "unknown"),
                created_at=tenant.get("created_at", datetime.utcnow()).isoformat(),
                updated_at=tenant.get("updated_at", datetime.utcnow()).isoformat()
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
    """Get current status of tenant AWS account creation and setup."""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can check tenant status"
        )
    
    try:
        # Validate tenant ID format
        if not ObjectId.is_valid(tenant_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        
        # Check account creation status
        result = await tenant_aws_service.check_account_creation_status(tenant_id)
        
        return TenantStatusResponse(
            success=result["success"],
            status=result.get("status", "UNKNOWN"),
            message=result.get("message", ""),
            aws_account_id=result.get("aws_account_id"),
            ready_for_setup=result.get("ready_for_setup", False),
            error=result.get("error")
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
    """Retry AWS account creation for a failed tenant."""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can retry tenant creation"
        )
    
    try:
        # Validate tenant ID format
        if not ObjectId.is_valid(tenant_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        
        # Retry account creation
        result = await tenant_aws_service.retry_failed_creation(tenant_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Retry failed")
            )
        
        return {
            "message": result["message"],
            "aws_request_id": result.get("aws_request_id"),
            "status": "CREATING"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrying tenant creation: {str(e)}"
        )

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """Delete tenant and cleanup resources (placeholder for future implementation)."""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can delete tenants"
        )
    
    # TODO: Implement comprehensive tenant deletion in Phase 7
    # - Remove AWS account from organization
    # - Cleanup resources
    # - Remove from database
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Tenant deletion will be implemented in Phase 7"
    )

@router.get("/{tenant_id}/details", response_model=TenantResponseWithAWS)
async def get_tenant_details(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """Get detailed information about a specific tenant."""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view tenant details"
        )
    
    try:
        # Validate tenant ID format
        if not ObjectId.is_valid(tenant_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        
        # Get tenant from database
        tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Return tenant details
        return TenantResponseWithAWS(
            id=str(tenant["_id"]),
            name=tenant["name"],
            email=tenant["email"],
            description=tenant.get("description", ""),
            status=tenant.get("status", "UNKNOWN"),
            aws_account_id=tenant.get("aws_account_id"),
            aws_account_email=tenant.get("aws_account_email"),
            bedrock_kb_id=tenant.get("bedrock_kb_id"),
            s3_bucket=tenant.get("s3_bucket"),
            resources_setup=tenant.get("resources_setup", False),
            token_limit_millions=tenant.get("token_limit_millions", 20),
            max_users=tenant.get("max_users", 100),
            created_by=tenant.get("created_by", "unknown"),
            created_at=tenant.get("created_at", datetime.utcnow()).isoformat(),
            updated_at=tenant.get("updated_at", datetime.utcnow()).isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant details: {str(e)}"
        )