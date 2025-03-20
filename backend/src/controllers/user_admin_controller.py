from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from src.models.auth_models import UserCreate, UserResponse, UserInDB
from src.services.auth_service import get_current_active_user
from src.utils.auth import get_current_user
from src.utils.db import db

router = APIRouter()
users_collection = db["users"]

@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user = Depends(get_current_user)):
    """
    Get all users (accessible by account admins and project admins).
    """
    # Check if current user is an account admin or project admin
    if current_user.role != "account_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage users"
        )
    
    # Retrieve all users, excluding sensitive information
    users = list(users_collection.find({}, {"hashed_password": 0}))
    return [UserResponse(**user) for user in users]

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate, 
    current_user = Depends(get_current_user)
):
    """
    Create a new user (only accessible by account admins and project admins).
    """
    # Check if current user is an account admin or project admin
    if current_user.role != "account_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage users"
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

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserCreate,
    current_user = Depends(get_current_user)
):
    """
    Update a user (accessible by account admins and project admins).
    """
    # Check if current user is an account admin or project admin
    if current_user.role != "account_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage users"
        )
    
    # Find the user
    existing_user = users_collection.find_one({"email": user_id})
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user details
    update_data = {
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "role": user_data.role
    }
    
    users_collection.update_one(
        {"email": user_id},
        {"$set": update_data}
    )
    
    # Retrieve and return updated user
    updated_user = users_collection.find_one({"email": user_id})
    return UserResponse(**updated_user)

@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a user (accessible by account admins and project admins).
    """
    # Check if current user is an account admin or project admin
    if current_user.role != "account_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage users"
        )
    
    # Find and delete the user
    result = users_collection.delete_one({"email": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deleted successfully"}