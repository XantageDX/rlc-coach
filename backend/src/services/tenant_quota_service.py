from typing import Dict, Optional
from datetime import datetime
from src.utils.db import db
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class TenantQuotaManager:
    def __init__(self):
        # Default quota: 20 million tokens per month
        self.default_token_limit = 20000000
        
        # Collections
        self.tenants_collection = db["tenants"]
        self.token_usage_collection = db["tenant_token_usage"]
        self.token_logs_collection = db["token_usage_logs"]
    
    async def get_tenant_token_limit(self, tenant_id: str) -> int:
        """Get token limit for a specific tenant"""
        try:
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                raise ValueError(f"Tenant {tenant_id} not found")
            
            # Use custom limit if set, otherwise use default
            return tenant.get('token_limit_millions', 20) * 1000000
        except Exception as e:
            logger.error(f"Error getting tenant token limit: {e}")
            return self.default_token_limit
    
    async def get_current_month_usage(self, tenant_id: str) -> Dict:
        """Get current month's token usage for a tenant"""
        current_month = datetime.utcnow().strftime("%Y-%m")
        
        usage = self.token_usage_collection.find_one({
            "tenant_id": tenant_id,
            "month": current_month
        })
        
        if not usage:
            # Initialize usage record for current month
            initial_usage = {
                "tenant_id": tenant_id,
                "month": current_month,
                "llm_tokens_used": 0,
                "embedding_tokens_used": 0,
                "total_tokens_used": 0,
                "token_limit": await self.get_tenant_token_limit(tenant_id),
                "warning_sent": False,
                "last_updated": datetime.utcnow()
            }
            self.token_usage_collection.insert_one(initial_usage)
            return initial_usage
        
        return usage
    
    async def check_token_quota(self, tenant_id: str, requested_tokens: int) -> Dict:
        """
        Check if tenant can use more tokens
        Returns: {"allowed": bool, "current_usage": int, "limit": int, "warning": bool, "message": str}
        """
        try:
            usage = await self.get_current_month_usage(tenant_id)
            token_limit = usage["token_limit"]
            current_total = usage["total_tokens_used"]
            
            # Check if request would exceed limit
            new_total = current_total + requested_tokens
            allowed = new_total <= token_limit
            
            # Check if warning threshold reached (15M tokens)
            warning_threshold = int(token_limit * 0.75)  # 75% of limit
            show_warning = new_total >= warning_threshold and not usage.get("warning_sent", False)
            
            return {
                "allowed": allowed,
                "current_usage": current_total,
                "limit": token_limit,
                "remaining": max(0, token_limit - current_total),
                "warning": show_warning,
                "message": self._get_quota_message(allowed, current_total, token_limit, show_warning)
            }
        except Exception as e:
            logger.error(f"Error checking token quota: {e}")
            # Allow request if there's an error (fail-safe)
            return {
                "allowed": True,
                "current_usage": 0,
                "limit": self.default_token_limit,
                "remaining": self.default_token_limit,
                "warning": False,
                "message": "Quota check failed, proceeding with request"
            }
    
    def _get_quota_message(self, allowed: bool, current: int, limit: int, warning: bool) -> str:
        """Generate appropriate quota message"""
        current_millions = current / 1000000
        limit_millions = limit / 1000000
        
        if not allowed:
            return f"Token quota exceeded: {current_millions:.1f}M/{limit_millions:.0f}M tokens used this month"
        elif warning:
            return f"Warning: {current_millions:.1f}M/{limit_millions:.0f}M tokens used this month (approaching limit)"
        else:
            return f"Token usage: {current_millions:.1f}M/{limit_millions:.0f}M tokens this month"

# Create global instance
quota_manager = TenantQuotaManager()