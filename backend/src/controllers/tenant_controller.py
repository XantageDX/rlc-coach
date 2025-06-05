from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict
from pydantic import BaseModel
from datetime import datetime
from src.utils.auth import get_current_user
from src.utils.db import db
from bson import ObjectId

router = APIRouter()

class TenantCreate(BaseModel):
    name: str
    email: str
    description: str = ""

class TenantResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str = "ACTIVE"
    created_at: str
    updated_at: str

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user = Depends(get_current_user)
):
    """Create new tenant organization (super_admin only)"""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can create tenants"
        )
    
    try:
        tenants_collection = db["tenants"]
        
        # Check if tenant already exists
        existing = tenants_collection.find_one({"email": tenant_data.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this email already exists"
            )
        
        # Create tenant record
        tenant_record = {
            "name": tenant_data.name,
            "email": tenant_data.email,
            "description": tenant_data.description,
            "status": "ACTIVE",
            "token_limit_millions": 20,  # Default 20M tokens
            "max_users": 100,            # Default 100 users
            "created_by": current_user.username,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = tenants_collection.insert_one(tenant_record)
        
        return {
            "message": "Tenant created successfully",
            "tenant_id": str(result.inserted_id),
            "tenant_name": tenant_data.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )

@router.get("/list")
async def list_tenants(current_user = Depends(get_current_user)):
    """List all tenant organizations"""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can list tenants"
        )
    
    try:
        tenants_collection = db["tenants"]
        tenants = list(tenants_collection.find({}, {
            "_id": 1, 
            "name": 1, 
            "email": 1, 
            "status": 1,
            "created_at": 1,
            "updated_at": 1
        }))
        
        # Convert ObjectId to string
        for tenant in tenants:
            tenant["id"] = str(tenant.pop("_id"))
            tenant["created_at"] = tenant["created_at"].isoformat() if tenant.get("created_at") else None
            tenant["updated_at"] = tenant["updated_at"].isoformat() if tenant.get("updated_at") else None
        
        return tenants
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenants: {str(e)}"
        )

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a tenant organization"""
    
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can delete tenants"
        )
    
    try:
        tenants_collection = db["tenants"]
        users_collection = db["users"]
        
        # Check if tenant exists
        tenant = tenants_collection.find_one({"_id": ObjectId(tenant_id)})
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Check if tenant has users
        user_count = users_collection.count_documents({"tenant_id": tenant_id})
        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete tenant: {user_count} users still assigned to this tenant"
            )
        
        # Delete tenant
        result = tenants_collection.delete_one({"_id": ObjectId(tenant_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return {"message": f"Tenant '{tenant['name']}' deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting tenant: {str(e)}"
        )