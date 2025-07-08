from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

from src.models.auth_models import UserCreate, UserResponse, TokenResponse
from src.services.auth_service import create_user, login_user, get_current_active_user
from src.utils.auth import get_current_user

router = APIRouter()

@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    return await login_user(form_data.username, form_data.password)


@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    """
    Get current user information.
    """
    user_data = await get_current_active_user(current_user)
    return UserResponse(
        email=user_data["email"],
        first_name=user_data["first_name"],
        last_name=user_data["last_name"],
        role=user_data["role"],
        tenant_id=user_data.get("tenant_id")
    )


# Add this OPTIONS handler for CORS preflight requests
@router.options("/{path:path}")
async def options_route(path: str):
    """
    Handle OPTIONS requests for CORS preflight.
    """
    return Response(status_code=200)

