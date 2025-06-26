# from fastapi import HTTPException, status
# from pymongo.collection import Collection
# from datetime import datetime, timedelta
# from typing import Optional
# import os
# from dotenv import load_dotenv

# from src.models.auth_models import UserCreate, UserInDB, UserResponse
# from src.utils.auth import get_password_hash, verify_password, create_access_token
# from src.utils.db import db

# # Load environment variables
# load_dotenv()

# ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# # Get users collection
# users_collection = db["users"]

# async def create_user(user_data: UserCreate) -> UserResponse:
#     """Create a new user"""
#     # Check if user already exists
#     existing_user = users_collection.find_one({"email": user_data.email})
#     if existing_user:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email already registered",
#         )

#     # Create user in database
#     hashed_password = get_password_hash(user_data.password)
#     user_in_db = UserInDB(
#         email=user_data.email,
#         first_name=user_data.first_name,
#         last_name=user_data.last_name,
#         hashed_password=hashed_password,
#         role=user_data.role,
#     )

#     # Insert into DB
#     result = users_collection.insert_one(user_in_db.dict())
    
#     # Return user without password
#     return UserResponse(
#         email=user_data.email,
#         first_name=user_data.first_name,
#         last_name=user_data.last_name,
#         role=user_data.role,
#     )


# async def authenticate_user(email: str, password: str):
#     """Authenticate a user"""
#     user = users_collection.find_one({"email": email})
#     if not user:
#         return False
#     if not verify_password(password, user["hashed_password"]):
#         return False
#     return user


# async def login_user(email: str, password: str):
#     """Login a user and return access token"""
#     user = await authenticate_user(email, password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect email or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     # Create token data
#     token_data = {
#         "sub": user["email"],
#         "role": user["role"],
#         "first_name": user["first_name"],
#         "last_name": user["last_name"],
#     }
    
#     # Create token
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data=token_data, expires_delta=access_token_expires
#     )
    
#     return {
#         "access_token": access_token,
#         "token_type": "bearer",
#         "role": user["role"],
#         "first_name": user["first_name"],
#         "last_name": user["last_name"],
#         "email": user["email"],
#     }


# async def get_current_active_user(user):
#     """Check if user is active"""
#     db_user = users_collection.find_one({"email": user.username})
#     if db_user is None:
#         raise HTTPException(status_code=404, detail="User not found")
#     if db_user.get("disabled"):
#         raise HTTPException(status_code=400, detail="Inactive user")
#     return db_user

#### TENANTS ####
from fastapi import HTTPException, status
from pymongo.collection import Collection
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

from src.models.auth_models import UserCreate, UserInDB, UserResponse
from src.utils.auth import get_password_hash, verify_password, create_access_token
from src.utils.db import db

# Load environment variables
load_dotenv()

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Get users collection
users_collection = db["users"]

async def create_user(user_data: UserCreate) -> UserResponse:
    """Create a new user with tenant assignment"""
    # Check if user already exists
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user in database
    hashed_password = get_password_hash(user_data.password)
    user_in_db = UserInDB(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_password,
        role=user_data.role,
        tenant_id=user_data.tenant_id,  # NEW: Include tenant assignment
    )

    # Insert into DB
    result = users_collection.insert_one(user_in_db.dict())
    
    # Return user without password
    return UserResponse(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        tenant_id=user_data.tenant_id,  # NEW: Include in response
    )


async def authenticate_user(email: str, password: str):
    """Authenticate a user"""
    user = users_collection.find_one({"email": email})
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user


# async def login_user(email: str, password: str):
#     """Login a user and return access token with tenant context"""
#     user = await authenticate_user(email, password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect email or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     # Create token data with tenant context
#     token_data = {
#         "sub": user["email"],
#         "role": user["role"],
#         "first_name": user["first_name"],
#         "last_name": user["last_name"],
#         "tenant_id": user.get("tenant_id"),  # NEW: Include tenant_id in token
#     }
    
#     # Create token
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data=token_data, expires_delta=access_token_expires
#     )
    
#     return {
#         "access_token": access_token,
#         "token_type": "bearer",
#         "role": user["role"],
#         "first_name": user["first_name"],
#         "last_name": user["last_name"],
#         "email": user["email"],
#         "tenant_id": user.get("tenant_id"),  # NEW: Include in login response
#     }

async def login_user(email: str, password: str):
    """Login a user and return access token with tenant context"""
    user = await authenticate_user(email, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create token data with tenant context
    token_data = {
        "sub": user["email"],
        "role": user["role"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "tenant_id": user.get("tenant_id"), # This goes to JWT (your auth.py handles ObjectId conversion)
    }

    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data=token_data, expires_delta=access_token_expires
    )

    # 🔧 FIX: Convert ObjectId to string for API response
    tenant_id_response = str(user.get("tenant_id")) if user.get("tenant_id") else None

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "email": user["email"],
        "tenant_id": tenant_id_response, # 🎯 NOW A STRING!
    }


async def get_current_active_user(user):
    """Check if user is active and return full user data"""
    db_user = users_collection.find_one({"email": user.username})
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.get("disabled"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return db_user