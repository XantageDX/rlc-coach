from typing import Dict, Optional
from datetime import datetime
from src.utils.db import db
from src.services.tenant_quota_service import quota_manager
import logging

logger = logging.getLogger(__name__)

class TokenUsageLogger:
    def __init__(self):
        self.token_usage_collection = db["tenant_token_usage"]
        self.token_logs_collection = db["token_usage_logs"]
    
    async def log_token_usage(
        self, 
        tenant_id: str, 
        user_email: str, 
        api_endpoint: str,
        token_type: str,  # "llm" or "embedding"
        tokens_used: int,
        model: str,
        request_id: Optional[str] = None
    ) -> bool:
        """
        Log token usage and update monthly totals
        """
        try:
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # 1. Create detailed log entry
            log_entry = {
                "tenant_id": tenant_id,
                "user_email": user_email,
                "api_endpoint": api_endpoint,
                "token_type": token_type,
                "tokens_used": tokens_used,
                "model": model,
                "timestamp": datetime.utcnow(),
                "request_id": request_id or f"{tenant_id}_{datetime.utcnow().timestamp()}"
            }
            self.token_logs_collection.insert_one(log_entry)
            
            # 2. Update monthly usage totals
            await self._update_monthly_usage(tenant_id, current_month, token_type, tokens_used)
            
            logger.info(f"Logged {tokens_used} {token_type} tokens for tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error logging token usage: {e}")
            return False
    
    async def _update_monthly_usage(self, tenant_id: str, month: str, token_type: str, tokens_used: int):
        """Update the monthly usage totals for a tenant"""
        try:
            # Get current usage record
            usage_record = await quota_manager.get_current_month_usage(tenant_id)
            
            # Prepare update based on token type
            if token_type == "llm":
                update_fields = {
                    "llm_tokens_used": usage_record["llm_tokens_used"] + tokens_used,
                    "total_tokens_used": usage_record["total_tokens_used"] + tokens_used,
                    "last_updated": datetime.utcnow()
                }
            elif token_type == "embedding":
                update_fields = {
                    "embedding_tokens_used": usage_record["embedding_tokens_used"] + tokens_used,
                    "total_tokens_used": usage_record["total_tokens_used"] + tokens_used,
                    "last_updated": datetime.utcnow()
                }
            else:
                logger.warning(f"Unknown token type: {token_type}")
                return
            
            # Update the record
            self.token_usage_collection.update_one(
                {"tenant_id": tenant_id, "month": month},
                {"$set": update_fields}
            )
            
            # Check if warning threshold reached and mark it
            new_total = update_fields["total_tokens_used"]
            token_limit = usage_record["token_limit"]
            warning_threshold = int(token_limit * 0.75)
            
            if new_total >= warning_threshold and not usage_record.get("warning_sent", False):
                self.token_usage_collection.update_one(
                    {"tenant_id": tenant_id, "month": month},
                    {"$set": {"warning_sent": True}}
                )
                logger.warning(f"Tenant {tenant_id} reached warning threshold: {new_total}/{token_limit} tokens")
            
        except Exception as e:
            logger.error(f"Error updating monthly usage: {e}")
    
    async def get_tenant_usage_summary(self, tenant_id: str, month: Optional[str] = None) -> Dict:
        """Get usage summary for a tenant for a specific month or current month"""
        if not month:
            month = datetime.utcnow().strftime("%Y-%m")
        
        try:
            usage = self.token_usage_collection.find_one({
                "tenant_id": tenant_id,
                "month": month
            })
            
            if not usage:
                return {
                    "tenant_id": tenant_id,
                    "month": month,
                    "llm_tokens_used": 0,
                    "embedding_tokens_used": 0,
                    "total_tokens_used": 0,
                    "token_limit": await quota_manager.get_tenant_token_limit(tenant_id),
                    "usage_percentage": 0
                }
            
            usage_percentage = (usage["total_tokens_used"] / usage["token_limit"]) * 100 if usage["token_limit"] > 0 else 0
            
            return {
                "tenant_id": tenant_id,
                "month": month,
                "llm_tokens_used": usage["llm_tokens_used"],
                "embedding_tokens_used": usage["embedding_tokens_used"],
                "total_tokens_used": usage["total_tokens_used"],
                "token_limit": usage["token_limit"],
                "usage_percentage": round(usage_percentage, 2),
                "warning_sent": usage.get("warning_sent", False),
                "last_updated": usage.get("last_updated")
            }
            
        except Exception as e:
            logger.error(f"Error getting tenant usage summary: {e}")
            return {"error": str(e)}

# Create global instance
token_logger = TokenUsageLogger()