from functools import wraps
from fastapi import HTTPException, status
from src.services.tenant_quota_service import quota_manager
from src.services.token_usage_service import token_logger
import logging

logger = logging.getLogger(__name__)

def enforce_token_quota(token_type: str = "llm", estimated_tokens: int = 1000):
    """
    Decorator to enforce token quotas on API endpoints
    
    Args:
        token_type: "llm" or "embedding"
        estimated_tokens: Rough estimate of tokens this endpoint might use
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract tenant_id from current user context
            # This assumes the endpoint has access to current_user
            current_user = None
            for arg in args:
                if hasattr(arg, 'username') and hasattr(arg, 'role'):
                    current_user = arg
                    break
            
            # Look for current_user in kwargs
            if not current_user and 'current_user' in kwargs:
                current_user = kwargs['current_user']
            
            if not current_user:
                logger.warning("No current_user found for quota enforcement")
                # Proceed without quota check (fail-safe)
                return await func(*args, **kwargs)
            
            # Get tenant_id from user
            tenant_id = getattr(current_user, 'tenant_id', None)
            if not tenant_id:
                # Super-admin or user without tenant - no quota enforcement
                return await func(*args, **kwargs)
            
            # Check quota before proceeding
            quota_check = await quota_manager.check_token_quota(tenant_id, estimated_tokens)
            
            if not quota_check["allowed"]:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Token quota exceeded",
                        "message": quota_check["message"],
                        "current_usage": quota_check["current_usage"],
                        "limit": quota_check["limit"]
                    }
                )
            
            # Execute the original function
            result = await func(*args, **kwargs)
            
            # If the function returns token usage info, log it
            if isinstance(result, dict) and 'tokens_used' in result:
                actual_tokens = result['tokens_used']
                api_endpoint = func.__name__
                model = result.get('model', 'unknown')
                
                await token_logger.log_token_usage(
                    tenant_id=tenant_id,
                    user_email=current_user.username,
                    api_endpoint=api_endpoint,
                    token_type=token_type,
                    tokens_used=actual_tokens,
                    model=model
                )
                
                # Add quota warning to response if needed
                if quota_check["warning"]:
                    result["quota_warning"] = quota_check["message"]
            
            return result
        
        return wrapper
    return decorator

async def log_tokens_manually(tenant_id: str, user_email: str, api_endpoint: str, 
                             token_type: str, tokens_used: int, model: str):
    """
    Manually log token usage (for cases where decorator can't be used)
    """
    await token_logger.log_token_usage(
        tenant_id=tenant_id,
        user_email=user_email,
        api_endpoint=api_endpoint,
        token_type=token_type,
        tokens_used=tokens_used,
        model=model
    )