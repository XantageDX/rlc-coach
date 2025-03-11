from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role: str = "standard"  # Default role


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
    tenant_id: Optional[str] = None


class UserResponse(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    tenant_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    first_name: str
    last_name: str
    email: str