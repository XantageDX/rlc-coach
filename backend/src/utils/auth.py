# from datetime import datetime, timedelta
# from typing import Optional
# from fastapi import Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordBearer
# from jose import JWTError, jwt
# from passlib.context import CryptContext
# from pydantic import BaseModel
# import os
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # JWT Configuration
# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = os.getenv("ALGORITHM")
# ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# # Password hashing
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# # User model for token data
# class TokenData(BaseModel):
#     username: Optional[str] = None
#     role: Optional[str] = None


# def verify_password(plain_password, hashed_password):
#     """Verify a password against a hash"""
#     return pwd_context.verify(plain_password, hashed_password)


# def get_password_hash(password):
#     """Generate password hash"""
#     return pwd_context.hash(password)


# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
#     """Create a new JWT token"""
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.utcnow() + expires_delta
#     else:
#         expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt


# async def get_current_user(token: str = Depends(oauth2_scheme)):
#     """Get current user from token"""
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         username: str = payload.get("sub")
#         role: str = payload.get("role")
#         if username is None:
#             raise credentials_exception
#         token_data = TokenData(username=username, role=role)
#     except JWTError:
#         raise credentials_exception
#     return token_data

#### TENANTS ####
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# User model for token data - UPDATED
class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    tenant_id: Optional[str] = None  # NEW


def verify_password(plain_password, hashed_password):
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """Generate password hash"""
    return pwd_context.hash(password)


# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
#     """Create a new JWT token"""
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.utcnow() + expires_delta
#     else:
#         expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a new JWT token with ObjectId serialization support"""
    to_encode = data.copy()
    
    # Convert ObjectId fields to strings for JWT serialization
    # This handles tenant_id, _id, and any other ObjectId fields
    for key, value in to_encode.items():
        if hasattr(value, '__class__') and value.__class__.__name__ == 'ObjectId':
            to_encode[key] = str(value)
        # Handle the case where value might be a string representation already
        elif key == 'tenant_id' and isinstance(value, str):
            # Keep as string (already compatible)
            pass
    
    # Set expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Create and return JWT token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from token - UPDATED"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        tenant_id: str = payload.get("tenant_id")  # NEW
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role, tenant_id=tenant_id)  # UPDATED
    except JWTError:
        raise credentials_exception
    return token_data