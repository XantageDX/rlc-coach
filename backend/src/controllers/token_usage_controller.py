from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Optional
from datetime import datetime
from src.utils.auth import get_current_user
from src.services.tenant_quota_service import quota_manager
from src.services.token_usage_service import token_logger
from src.utils.db import db
from bson import ObjectId
import calendar

router = APIRouter()

@router.get("/usage/{tenant_id}")
async def get_tenant_usage(
    tenant_id: str,
    month: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get token usage for a specific tenant"""
    # Only super_admin can view any tenant, others can only view their own
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this tenant's usage"
        )
    
    try:
        usage_summary = await token_logger.get_tenant_usage_summary(tenant_id, month)
        return usage_summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving usage data: {str(e)}"
        )

@router.get("/usage-all")
async def get_all_tenants_usage(current_user = Depends(get_current_user)):
    """Get token usage for all tenants (super_admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view all tenant usage"
        )
    
    try:
        current_month = datetime.utcnow().strftime("%Y-%m")
        tenants_collection = db["tenants"]
        token_usage_collection = db["tenant_token_usage"]
        
        # Get all tenants
        tenants = list(tenants_collection.find({}, {"_id": 1, "name": 1, "token_limit_millions": 1}))
        
        usage_data = []
        for tenant in tenants:
            tenant_id = str(tenant["_id"])
            usage = await token_logger.get_tenant_usage_summary(tenant_id, current_month)
            
            usage_data.append({
                "tenant_id": tenant_id,
                "tenant_name": tenant["name"],
                "usage": usage
            })
        
        return {
            "month": current_month,
            "tenants": usage_data,
            "total_tenants": len(usage_data)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving usage data: {str(e)}"
        )

@router.put("/limit/{tenant_id}")
async def update_tenant_token_limit(
    tenant_id: str,
    new_limit_millions: int,
    current_user = Depends(get_current_user)
):
    """Update token limit for a tenant (super_admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can update token limits"
        )
    
    if new_limit_millions <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token limit must be greater than 0"
        )
    
    try:
        tenants_collection = db["tenants"]
        token_usage_collection = db["tenant_token_usage"]
        
        # Update tenant record
        result = tenants_collection.update_one(
            {"_id": ObjectId(tenant_id)},
            {"$set": {"token_limit_millions": new_limit_millions, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Update current month's usage record limit
        current_month = datetime.utcnow().strftime("%Y-%m")
        new_limit_tokens = new_limit_millions * 1000000
        
        token_usage_collection.update_one(
            {"tenant_id": tenant_id, "month": current_month},
            {"$set": {"token_limit": new_limit_tokens}}
        )
        
        return {
            "message": f"Token limit updated to {new_limit_millions}M tokens",
            "tenant_id": tenant_id,
            "new_limit_millions": new_limit_millions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating token limit: {str(e)}"
        )

@router.get("/logs/{tenant_id}")
async def get_tenant_usage_logs(
    tenant_id: str,
    limit: int = 100,
    current_user = Depends(get_current_user)
):
    """Get detailed usage logs for a tenant"""
    # Only super_admin can view any tenant, others can only view their own
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this tenant's logs"
        )
    
    try:
        token_logs_collection = db["token_usage_logs"]
        
        logs = list(token_logs_collection.find(
            {"tenant_id": tenant_id},
            {"_id": 0}  # Exclude MongoDB _id
        ).sort("timestamp", -1).limit(limit))
        
        # Convert datetime objects to strings for JSON serialization
        for log in logs:
            if "timestamp" in log:
                log["timestamp"] = log["timestamp"].isoformat()
        
        return {
            "tenant_id": tenant_id,
            "logs": logs,
            "count": len(logs)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving usage logs: {str(e)}"
        )

@router.post("/refresh-usage")
async def refresh_usage_data(current_user = Depends(get_current_user)):
    """Manually refresh usage data calculations (super_admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can refresh usage data"
        )
    
    try:
        # This endpoint is mainly for triggering UI refresh
        # The actual calculations happen in real-time through our logging system
        return {
            "message": "Usage data refreshed",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error refreshing usage data: {str(e)}"
        )