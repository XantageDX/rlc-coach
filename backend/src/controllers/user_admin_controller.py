# from fastapi import APIRouter, Depends, HTTPException, status
# from typing import List
# from src.models.auth_models import UserCreate, UserResponse, UserInDB
# from src.services.auth_service import get_current_active_user
# from src.utils.auth import get_current_user
# from src.utils.db import db

# router = APIRouter()
# users_collection = db["users"]

# @router.get("/users", response_model=List[UserResponse])
# async def list_users(current_user = Depends(get_current_user)):
#     """
#     Get all users (accessible by account admins and project admins).
#     """
#     # Check if current user is an account admin or project admin
#     if current_user.role != "account_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Not authorized to manage users"
#         )
    
#     # Retrieve all users, excluding sensitive information
#     users = list(users_collection.find({}, {"hashed_password": 0}))
#     return [UserResponse(**user) for user in users]

# @router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
# async def create_user(
#     user_data: UserCreate, 
#     current_user = Depends(get_current_user)
# ):
#     """
#     Create a new user (only accessible by account admins and project admins).
#     """
#     # Check if current user is an account admin or project admin
#     if current_user.role != "account_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Not authorized to manage users"
#         )
    
#     # Check if user already exists
#     existing_user = users_collection.find_one({"email": user_data.email})
#     if existing_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email already registered"
#         )

#     # Create user in database
#     from src.services.auth_service import create_user as create_user_service
#     return await create_user_service(user_data)

# @router.put("/users/{user_id}", response_model=UserResponse)
# async def update_user(
#     user_id: str,
#     user_data: UserCreate,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Update a user (accessible by account admins and project admins).
#     """
#     # Check if current user is an account admin or project admin
#     if current_user.role != "account_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Not authorized to manage users"
#         )
    
#     # Find the user
#     existing_user = users_collection.find_one({"email": user_id})
#     if not existing_user:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="User not found"
#         )
    
#     # Update user details
#     update_data = {
#         "first_name": user_data.first_name,
#         "last_name": user_data.last_name,
#         "role": user_data.role
#     }
    
#     users_collection.update_one(
#         {"email": user_id},
#         {"$set": update_data}
#     )
    
#     # Retrieve and return updated user
#     updated_user = users_collection.find_one({"email": user_id})
#     return UserResponse(**updated_user)

# @router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
# async def delete_user(
#     user_id: str,
#     current_user = Depends(get_current_user)
# ):
#     """
#     Delete a user (accessible by account admins and project admins).
#     """
#     # Check if current user is an account admin or project admin
#     if current_user.role != "account_admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Not authorized to manage users"
#         )
    
#     # Find and delete the user
#     result = users_collection.delete_one({"email": user_id})
    
#     if result.deleted_count == 0:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="User not found"
#         )
    
#     return {"message": "User deleted successfully"}

#### TENANTS ####
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from src.models.auth_models import UserCreate, UserResponse, UserInDB
from src.services.auth_service import get_current_active_user
from src.utils.auth import get_current_user
from src.utils.db import db
from bson import ObjectId

router = APIRouter()
users_collection = db["users"]
tenants_collection = db["tenants"]

@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user = Depends(get_current_user)):
    """
    Get users based on role:
    - super_admin: sees all users
    - tenant_admin: sees only users in their tenant
    """
    try:
        if current_user.role == "super_admin":
            # Super admin sees all users
            users = list(users_collection.find({}, {"hashed_password": 0}))
        elif current_user.role == "tenant_admin":
            # Tenant admin sees only users in their tenant
            if not current_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tenant admin must be assigned to a tenant"
                )
            users = list(users_collection.find(
                {"tenant_id": current_user.tenant_id}, 
                {"hashed_password": 0}
            ))
        else:
            # Regular users cannot manage other users
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to manage users"
            )
        
        return [UserResponse(**user) for user in users]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving users: {str(e)}"
        )

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate, 
    current_user = Depends(get_current_user)
):
    """
    Create a new user with role-based restrictions:
    - super_admin: can create any user and assign to any tenant
    - tenant_admin: can only create users in their own tenant
    """
    try:
        if current_user.role == "super_admin":
            # Super admin can create any user
            pass  # No restrictions
        elif current_user.role == "tenant_admin":
            # Tenant admin can only create users in their tenant
            if not current_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tenant admin must be assigned to a tenant"
                )
            # Force the new user to be in the same tenant
            user_data.tenant_id = current_user.tenant_id
            # Tenant admin cannot create super_admin or tenant_admin users
            if user_data.role in ["super_admin", "tenant_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tenant admins can only create regular users"
                )
            user_data.role = "user"  # Force role to be user
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create users"
            )
        
        # Validate tenant_id if provided
        if user_data.tenant_id:
            tenant = tenants_collection.find_one({"_id": ObjectId(user_data.tenant_id)})
            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid tenant ID"
                )
        
        # Check if user already exists
        existing_user = users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user in database
        from src.services.auth_service import create_user as create_user_service
        return await create_user_service(user_data)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserCreate,
    current_user = Depends(get_current_user)
):
    """
    Update a user with role-based restrictions
    """
    try:
        # Find the user to update
        existing_user = users_collection.find_one({"email": user_id})
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Role-based authorization
        if current_user.role == "super_admin":
            # Super admin can update any user
            pass
        elif current_user.role == "tenant_admin":
            # Tenant admin can only update users in their tenant
            if existing_user.get("tenant_id") != current_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot update users outside your tenant"
                )
            # Cannot change role to super_admin or tenant_admin
            if user_data.role in ["super_admin", "tenant_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot promote users to admin roles"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update users"
            )
        
        # Update user details (excluding password for security)
        update_data = {
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "role": user_data.role,
            "tenant_id": user_data.tenant_id,
            "updated_at": datetime.utcnow()
        }
        
        users_collection.update_one(
            {"email": user_id},
            {"$set": update_data}
        )
        
        # Retrieve and return updated user
        updated_user = users_collection.find_one({"email": user_id})
        return UserResponse(**updated_user)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a user with role-based restrictions
    """
    try:
        # Find the user to delete
        existing_user = users_collection.find_one({"email": user_id})
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Role-based authorization
        if current_user.role == "super_admin":
            # Super admin can delete any user
            pass
        elif current_user.role == "tenant_admin":
            # Tenant admin can only delete users in their tenant
            if existing_user.get("tenant_id") != current_user.tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete users outside your tenant"
                )
            # Cannot delete admin users
            if existing_user.get("role") in ["super_admin", "tenant_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete admin users"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete users"
            )
        
        # Delete the user
        result = users_collection.delete_one({"email": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.get("/tenants")
async def list_tenants(current_user = Depends(get_current_user)):
    """Get list of tenants for user assignment (super_admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can list tenants"
        )
    
    try:
        tenants = list(tenants_collection.find({}, {"_id": 1, "name": 1, "email": 1}))
        
        # Convert ObjectId to string
        for tenant in tenants:
            tenant["id"] = str(tenant.pop("_id"))
        
        return tenants
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenants: {str(e)}"
        )