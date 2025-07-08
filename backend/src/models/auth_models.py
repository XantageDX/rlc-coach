#### TENANTS ####
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role: str = "user"  # Changed default from "standard" to "user"
    tenant_id: Optional[str] = None  # NEW: For tenant assignment


class UserLogin(BaseModel):
    email: str
    password: str


class UserInDB(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    hashed_password: str
    role: str
    disabled: bool = False
    tenant_id: Optional[str] = None  # NEW: For tenant assignment


class UserResponse(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    tenant_id: Optional[str] = None  # NEW: For frontend to know tenant context


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    first_name: str
    last_name: str
    email: str
    tenant_id: Optional[str] = None  # NEW: Include tenant in token response