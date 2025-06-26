# from typing import Dict, Optional
# from datetime import datetime, timezone, timedelta
# from src.utils.db import db
# from src.services.tenant_quota_service import quota_manager
# import logging

# logger = logging.getLogger(__name__)

# class TokenUsageLogger:
#     def __init__(self):
#         self.token_usage_collection = db["tenant_token_usage"]
#         self.token_logs_collection = db["token_usage_logs"]
    
#     async def log_token_usage(
#         self, 
#         tenant_id: str, 
#         user_email: str, 
#         api_endpoint: str,
#         token_type: str,  # "llm" or "embedding"
#         tokens_used: int,
#         model: str,
#         request_id: Optional[str] = None
#     ) -> bool:
#         """
#         Log token usage and update monthly totals
#         """
#         try:
#             current_month = datetime.utcnow().strftime("%Y-%m")
            
#             # 1. Create detailed log entry
#             log_entry = {
#                 "tenant_id": tenant_id,
#                 "user_email": user_email,
#                 "api_endpoint": api_endpoint,
#                 "token_type": token_type,
#                 "tokens_used": tokens_used,
#                 "model": model,
#                 "timestamp": datetime.utcnow(),
#                 "request_id": request_id or f"{tenant_id}_{datetime.utcnow().timestamp()}"
#             }
#             self.token_logs_collection.insert_one(log_entry)
            
#             # 2. Update monthly usage totals
#             await self._update_monthly_usage(tenant_id, current_month, token_type, tokens_used)
            
#             logger.info(f"Logged {tokens_used} {token_type} tokens for tenant {tenant_id}")
#             return True
            
#         except Exception as e:
#             logger.error(f"Error logging token usage: {e}")
#             return False
    
#     async def _update_monthly_usage(self, tenant_id: str, month: str, token_type: str, tokens_used: int):
#         """Update the monthly usage totals for a tenant"""
#         try:
#             # Get current usage record
#             usage_record = await quota_manager.get_current_month_usage(tenant_id)
            
#             # Prepare update based on token type
#             if token_type == "llm":
#                 update_fields = {
#                     "llm_tokens_used": usage_record["llm_tokens_used"] + tokens_used,
#                     "total_tokens_used": usage_record["total_tokens_used"] + tokens_used,
#                     "last_updated": datetime.utcnow()
#                 }
#             elif token_type == "embedding":
#                 update_fields = {
#                     "embedding_tokens_used": usage_record["embedding_tokens_used"] + tokens_used,
#                     "total_tokens_used": usage_record["total_tokens_used"] + tokens_used,
#                     "last_updated": datetime.utcnow()
#                 }
#             else:
#                 logger.warning(f"Unknown token type: {token_type}")
#                 return
            
#             # Update the record
#             self.token_usage_collection.update_one(
#                 {"tenant_id": tenant_id, "month": month},
#                 {"$set": update_fields}
#             )
            
#             # Check if warning threshold reached and mark it
#             new_total = update_fields["total_tokens_used"]
#             token_limit = usage_record["token_limit"]
#             warning_threshold = int(token_limit * 0.75)
            
#             if new_total >= warning_threshold and not usage_record.get("warning_sent", False):
#                 self.token_usage_collection.update_one(
#                     {"tenant_id": tenant_id, "month": month},
#                     {"$set": {"warning_sent": True}}
#                 )
#                 logger.warning(f"Tenant {tenant_id} reached warning threshold: {new_total}/{token_limit} tokens")
            
#         except Exception as e:
#             logger.error(f"Error updating monthly usage: {e}")
    
#     async def get_tenant_usage_summary(self, tenant_id: str, month: Optional[str] = None) -> Dict:
#         """Get usage summary for a tenant for a specific month or current month"""
#         if not month:
#             month = datetime.utcnow().strftime("%Y-%m")
        
#         try:
#             usage = self.token_usage_collection.find_one({
#                 "tenant_id": tenant_id,
#                 "month": month
#             })
            
#             if not usage:
#                 return {
#                     "tenant_id": tenant_id,
#                     "month": month,
#                     "llm_tokens_used": 0,
#                     "embedding_tokens_used": 0,
#                     "total_tokens_used": 0,
#                     "token_limit": await quota_manager.get_tenant_token_limit(tenant_id),
#                     "usage_percentage": 0
#                 }
            
#             usage_percentage = (usage["total_tokens_used"] / usage["token_limit"]) * 100 if usage["token_limit"] > 0 else 0
            
#             return {
#                 "tenant_id": tenant_id,
#                 "month": month,
#                 "llm_tokens_used": usage["llm_tokens_used"],
#                 "embedding_tokens_used": usage["embedding_tokens_used"],
#                 "total_tokens_used": usage["total_tokens_used"],
#                 "token_limit": usage["token_limit"],
#                 "usage_percentage": round(usage_percentage, 2),
#                 "warning_sent": usage.get("warning_sent", False),
#                 "last_updated": usage.get("last_updated")
#             }
            
#         except Exception as e:
#             logger.error(f"Error getting tenant usage summary: {e}")
#             return {"error": str(e)}

# # Create global instance
# token_logger = TokenUsageLogger()

#### NEW
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
from src.utils.db import db
from src.services.tenant_quota_service import quota_manager
import logging
import tiktoken
from src.config.model_constants import LLM_MODEL, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

class TokenUsageLogger:
    def __init__(self):
        self.token_usage_collection = db["tenant_token_usage"]
        self.token_logs_collection = db["token_usage_logs"]
        
        # Initialize tiktoken encoder for token estimation
        try:
            self.encoder = tiktoken.encoding_for_model("gpt-4")
        except:
            self.encoder = tiktoken.get_encoding("cl100k_base")
    
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

    # NEW PHASE 2 METHODS
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for given text"""
        if not text:
            return 0
        try:
            return len(self.encoder.encode(str(text)))
        except:
            return max(1, len(str(text)) // 4)  # Fallback estimation

    async def log_token_usage_by_model_type(
        self,
        tenant_id: str,
        user_email: str,
        api_endpoint: str,
        model_type: str,  # "llm" or "embedding"
        tokens_used: int,
        model: str = LLM_MODEL
    ):
        """
        Enhanced token logging with historical tracking
        Call this instead of the basic log_token_usage for Phase 2
        """
        
        # Call existing log_token_usage method first (keep existing functionality)
        await self.log_token_usage(
            tenant_id=tenant_id,
            user_email=user_email,
            api_endpoint=api_endpoint,
            token_type=model_type,
            tokens_used=tokens_used,
            model=model
        )
        
        # Add enhanced historical tracking
        current_time = datetime.now(timezone.utc)
        current_month = current_time.strftime("%Y-%m")
        
        # Store detailed historical log (never deleted)
        detailed_log_collection = db["token_usage_history"]
        detailed_log_collection.insert_one({
            "tenant_id": tenant_id,
            "user_email": user_email,
            "api_endpoint": api_endpoint,
            "model_type": model_type,
            "tokens_used": tokens_used,
            "model": model,
            "timestamp": current_time,
            "month": current_month,
            "year": current_time.year,
            "day": current_time.day
        })
        
        # Update monthly summary for current month
        monthly_collection = db["monthly_token_usage"]
        
        # Separate fields for LLM vs Embedding tokens
        if model_type == "llm":
            update_fields = {
                "$inc": {
                    "total_llm_tokens": tokens_used,
                    "total_tokens": tokens_used
                }
            }
        elif model_type == "embedding":
            update_fields = {
                "$inc": {
                    "total_embedding_tokens": tokens_used,
                    "total_tokens": tokens_used
                }
            }
        else:
            # Fallback for unknown types
            update_fields = {
                "$inc": {
                    "total_other_tokens": tokens_used,
                    "total_tokens": tokens_used
                }
            }
        
        update_fields["$set"] = {
            "last_updated": current_time,
            "month": current_month,
            "year": current_time.year
        }
        
        update_fields["$setOnInsert"] = {
            "tenant_id": tenant_id,
            "month": current_month,
            "year": current_time.year,
            "total_llm_tokens": 0,
            "total_embedding_tokens": 0,
            "total_other_tokens": 0,
            "total_tokens": 0,
            "created_at": current_time
        }
        
        monthly_collection.update_one(
            {"tenant_id": tenant_id, "month": current_month},
            update_fields,  # ✅ CORRECT - Pass the operators directly
            upsert=True
        )

    async def log_llm_usage_from_texts(
        self,
        tenant_id: str,
        user_email: str,
        endpoint: str,
        input_text: str,
        output_text: str,
        model: str = LLM_MODEL
    ):
        """
        Convenience method to log LLM usage with automatic token counting
        Use this in controllers for LLM calls
        """
        
        input_tokens = self.estimate_tokens(input_text)
        output_tokens = self.estimate_tokens(output_text)
        total_tokens = input_tokens + output_tokens
        
        await self.log_token_usage_by_model_type(
            tenant_id=tenant_id,
            user_email=user_email,
            api_endpoint=endpoint,
            model_type="llm",
            tokens_used=total_tokens,
            model=model
        )
        
        return {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens
        }

    async def log_embedding_usage_from_text(
        self,
        tenant_id: str,
        user_email: str,
        endpoint: str,
        text_content: str,
        model: str = EMBEDDING_MODEL
    ):
        """
        Convenience method to log embedding usage with automatic token counting
        Use this in controllers for embedding calls
        """
        
        tokens = self.estimate_tokens(text_content)
        
        await self.log_token_usage_by_model_type(
            tenant_id=tenant_id,
            user_email=user_email,
            api_endpoint=endpoint,
            model_type="embedding",
            tokens_used=tokens,
            model=model
        )
        
        return {
            "tokens": tokens,
            "text_length": len(text_content)
        }

    def get_super_admin_monthly_report(self, month: str = None):
        """
        Generate monthly token usage report for super admin only
        No pricing - just token counts by model type
        """
        
        if not month:
            month = datetime.now(timezone.utc).strftime("%Y-%m")
        
        monthly_collection = db["monthly_token_usage"]
        tenants_collection = db["tenants"]
        
        # Get all monthly usage data for specified month
        monthly_usage = list(monthly_collection.find({"month": month}))
        
        # Get tenant names
        tenant_names = {}
        tenants = list(tenants_collection.find({}, {"_id": 1, "name": 1}))
        for tenant in tenants:
            tenant_names[str(tenant["_id"])] = tenant["name"]
        
        # Build report
        report_data = []
        total_llm_tokens = 0
        total_embedding_tokens = 0
        
        for usage in monthly_usage:
            tenant_id = usage["tenant_id"]
            tenant_name = tenant_names.get(tenant_id, "Unknown Tenant")
            
            llm_tokens = usage.get("total_llm_tokens", 0)
            embedding_tokens = usage.get("total_embedding_tokens", 0)
            
            total_llm_tokens += llm_tokens
            total_embedding_tokens += embedding_tokens
            
            report_data.append({
                "tenant_id": tenant_id,
                "tenant_name": tenant_name,
                "llm_tokens": llm_tokens,
                "embedding_tokens": embedding_tokens,
                "total_tokens": llm_tokens + embedding_tokens,
                "month": month
            })
        
        return {
            "month": month,
            "total_llm_tokens": total_llm_tokens,
            "total_embedding_tokens": total_embedding_tokens,
            "total_tokens": total_llm_tokens + total_embedding_tokens,
            "tenant_count": len(report_data),
            "tenants": report_data,
            "generated_at": datetime.now(timezone.utc)
        }

    def get_tenant_historical_usage(
        self,
        tenant_id: str,
        start_month: str = None,
        end_month: str = None,
        year: int = None
    ):
        """
        Get historical token usage for a tenant across specified time period
        """
        
        monthly_collection = db["monthly_token_usage"]
        
        # Build query
        query = {"tenant_id": tenant_id}
        
        if year:
            # Get all months for specific year
            query["year"] = year
        elif start_month and end_month:
            # Get range of months
            query["month"] = {"$gte": start_month, "$lte": end_month}
        elif start_month:
            # Get from start_month to current
            query["month"] = {"$gte": start_month}
        
        # Get historical records sorted by month
        historical_data = list(monthly_collection.find(query).sort("month", 1))
        
        # Calculate totals across the period
        total_llm = sum(record.get("total_llm_tokens", 0) for record in historical_data)
        total_embedding = sum(record.get("total_embedding_tokens", 0) for record in historical_data)
        total_other = sum(record.get("total_other_tokens", 0) for record in historical_data)
        
        return {
            "tenant_id": tenant_id,
            "period": {
                "start_month": start_month,
                "end_month": end_month,
                "year": year
            },
            "summary": {
                "total_llm_tokens": total_llm,
                "total_embedding_tokens": total_embedding,
                "total_other_tokens": total_other,
                "total_tokens": total_llm + total_embedding + total_other,
                "months_included": len(historical_data)
            },
            "monthly_breakdown": historical_data
        }

    def get_super_admin_historical_report(
        self,
        start_month: str = None,
        end_month: str = None,
        year: int = None
    ):
        """
        Generate historical token usage report across multiple months
        Super admin only - for analyzing trends and historical usage
        """
        
        monthly_collection = db["monthly_token_usage"]
        tenants_collection = db["tenants"]
        
        # Build query for time period
        query = {}
        if year:
            query["year"] = year
        elif start_month and end_month:
            query["month"] = {"$gte": start_month, "$lte": end_month}
        elif start_month:
            query["month"] = {"$gte": start_month}
        
        # Get all usage data for period
        historical_usage = list(monthly_collection.find(query).sort([("month", 1), ("tenant_id", 1)]))
        
        # Get tenant names
        tenant_names = {}
        tenants = list(tenants_collection.find({}, {"_id": 1, "name": 1}))
        for tenant in tenants:
            tenant_names[str(tenant["_id"])] = tenant["name"]
        
        # Group by tenant and month
        tenant_data = {}
        for usage in historical_usage:
            tenant_id = usage["tenant_id"]
            month = usage["month"]
            
            if tenant_id not in tenant_data:
                tenant_data[tenant_id] = {
                    "tenant_name": tenant_names.get(tenant_id, "Unknown Tenant"),
                    "months": {},
                    "total_llm_tokens": 0,
                    "total_embedding_tokens": 0,
                    "total_tokens": 0
                }
            
            llm_tokens = usage.get("total_llm_tokens", 0)
            embedding_tokens = usage.get("total_embedding_tokens", 0)
            
            tenant_data[tenant_id]["months"][month] = {
                "llm_tokens": llm_tokens,
                "embedding_tokens": embedding_tokens,
                "total_tokens": llm_tokens + embedding_tokens
            }
            
            # Add to tenant totals
            tenant_data[tenant_id]["total_llm_tokens"] += llm_tokens
            tenant_data[tenant_id]["total_embedding_tokens"] += embedding_tokens
            tenant_data[tenant_id]["total_tokens"] += llm_tokens + embedding_tokens
        
        # Calculate overall totals
        overall_totals = {
            "total_llm_tokens": sum(data["total_llm_tokens"] for data in tenant_data.values()),
            "total_embedding_tokens": sum(data["total_embedding_tokens"] for data in tenant_data.values()),
            "total_tokens": sum(data["total_tokens"] for data in tenant_data.values())
        }
        
        return {
            "period": {
                "start_month": start_month,
                "end_month": end_month,
                "year": year
            },
            "overall_totals": overall_totals,
            "tenant_count": len(tenant_data),
            "tenants": tenant_data,
            "generated_at": datetime.now(timezone.utc)
        }

    def get_yearly_usage_summary(self, year: int = None):
        """Get yearly summary for all tenants"""
        if not year:
            year = datetime.now(timezone.utc).year
        
        return self.get_super_admin_historical_report(year=year)

# Create global instance
token_logger = TokenUsageLogger()