from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Optional
from datetime import datetime
from src.utils.auth import get_current_user
from src.services.tenant_quota_service import quota_manager
from src.services.token_usage_service import token_logger
from src.utils.db import db
from bson import ObjectId
import calendar

# NEW
import csv
import io
from fastapi.responses import StreamingResponse, JSONResponse
from datetime import datetime, timezone

router = APIRouter()

@router.get("/monthly-report")
async def get_monthly_token_report(
    month: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get monthly token usage report by model type (super_admin only)
    Returns token counts only - NO PRICING
    
    Example: GET /token-usage/monthly-report?month=2025-03
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view monthly token reports"
        )
    
    try:
        # Use enhanced method from token_usage_service
        report = await token_logger.get_super_admin_monthly_report(month)
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating monthly report: {str(e)}"
        )

@router.get("/historical-report")
async def get_historical_token_report(
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    year: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Get historical token usage report across multiple months (super_admin only)
    
    Query parameters:
    - start_month: "2025-03" (optional)
    - end_month: "2025-06" (optional)
    - year: 2025 (optional - gets all months for the year)
    
    Examples:
    - GET /token-usage/historical-report?year=2024 (all of 2024)
    - GET /token-usage/historical-report?start_month=2025-01&end_month=2025-06 (Jan-June 2025)
    - GET /token-usage/historical-report?start_month=2025-03 (March 2025 to current)
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view historical token reports"
        )
    
    try:
        # Use enhanced historical method
        report = await token_logger.get_super_admin_historical_report(
            start_month=start_month,
            end_month=end_month,
            year=year
        )
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating historical report: {str(e)}"
        )

@router.get("/yearly-summary/{year}")
async def get_yearly_usage_summary(
    year: int,
    current_user = Depends(get_current_user)
):
    """
    Get yearly token usage summary for all tenants (super_admin only)
    
    Example: GET /token-usage/yearly-summary/2024
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view yearly summaries"
        )
    
    try:
        report = await token_logger.get_yearly_usage_summary(year)
        return report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating yearly summary: {str(e)}"
        )

@router.get("/tenant-history/{tenant_id}")
async def get_tenant_historical_usage(
    tenant_id: str,
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    year: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Get historical usage for specific tenant across time periods
    
    Examples:
    - GET /token-usage/tenant-history/123?year=2024 (tenant 123's usage for all of 2024)
    - GET /token-usage/tenant-history/123?start_month=2025-01&end_month=2025-03 (Jan-March 2025)
    """
    # Authorization check
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this tenant's historical usage"
        )
    
    try:
        history = await token_logger.get_tenant_historical_usage(
            tenant_id=tenant_id,
            start_month=start_month,
            end_month=end_month,
            year=year
        )
        return history
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant historical usage: {str(e)}"
        )

@router.get("/monthly-summary/{tenant_id}")
async def get_tenant_monthly_summary(
    tenant_id: str,
    month: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get monthly token summary for specific tenant
    Separated by LLM vs Embedding tokens
    """
    # Authorization check
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this tenant's monthly summary"
        )
    
    try:
        if not month:
            month = datetime.utcnow().strftime("%Y-%m")
        
        from src.utils.db import db
        monthly_collection = db["monthly_token_usage"]
        
        summary = monthly_collection.find_one({
            "tenant_id": tenant_id,
            "month": month
        })
        
        if not summary:
            return {
                "tenant_id": tenant_id,
                "month": month,
                "total_llm_tokens": 0,
                "total_embedding_tokens": 0,
                "total_tokens": 0,
                "message": "No usage data for this month"
            }
        
        return {
            "tenant_id": tenant_id,
            "month": month,
            "year": summary.get("year"),
            "total_llm_tokens": summary.get("total_llm_tokens", 0),
            "total_embedding_tokens": summary.get("total_embedding_tokens", 0),
            "total_other_tokens": summary.get("total_other_tokens", 0),
            "total_tokens": summary.get("total_tokens", 0),
            "last_updated": summary.get("last_updated"),
            "created_at": summary.get("created_at")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving monthly summary: {str(e)}"
        )

@router.get("/comparison/{tenant_id}")
async def get_tenant_monthly_comparison(
    tenant_id: str,
    months: int = 6,  # Compare last 6 months by default
    current_user = Depends(get_current_user)
):
    """
    Get month-over-month comparison for a tenant
    Shows usage trends over specified number of months
    
    Example: GET /token-usage/comparison/123?months=12 (last 12 months comparison)
    """
    # Authorization check
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this tenant's usage comparison"
        )
    
    try:
        from datetime import datetime, timedelta
        
        # Calculate start month (months ago from current)
        current_date = datetime.now(timezone.utc)
        start_date = current_date - timedelta(days=months * 30)  # Approximate
        start_month = start_date.strftime("%Y-%m")
        
        # Get historical data
        history = await token_logger.get_tenant_historical_usage(
            tenant_id=tenant_id,
            start_month=start_month
        )
        
        # Calculate trends and percentages
        monthly_data = history.get("monthly_breakdown", [])
        
        # Sort by month to ensure proper order
        monthly_data.sort(key=lambda x: x["month"])
        
        # Calculate month-over-month changes
        comparison_data = []
        previous_month_data = None
        
        for month_data in monthly_data:
            month_comparison = {
                "month": month_data["month"],
                "year": month_data.get("year"),
                "llm_tokens": month_data.get("total_llm_tokens", 0),
                "embedding_tokens": month_data.get("total_embedding_tokens", 0),
                "total_tokens": month_data.get("total_tokens", 0)
            }
            
            # Calculate percentage changes if we have previous month
            if previous_month_data:
                prev_total = previous_month_data.get("total_tokens", 0)
                current_total = month_comparison["total_tokens"]
                
                if prev_total > 0:
                    percent_change = ((current_total - prev_total) / prev_total) * 100
                    month_comparison["percent_change"] = round(percent_change, 2)
                    month_comparison["absolute_change"] = current_total - prev_total
                else:
                    month_comparison["percent_change"] = 0 if current_total == 0 else 100
                    month_comparison["absolute_change"] = current_total
            
            comparison_data.append(month_comparison)
            previous_month_data = month_data
        
        # Calculate overall trend
        if len(comparison_data) >= 2:
            first_month = comparison_data[0]["total_tokens"]
            last_month = comparison_data[-1]["total_tokens"]
            
            if first_month > 0:
                overall_trend = ((last_month - first_month) / first_month) * 100
            else:
                overall_trend = 0 if last_month == 0 else 100
        else:
            overall_trend = 0
        
        return {
            "tenant_id": tenant_id,
            "comparison_period": {
                "months_analyzed": len(comparison_data),
                "start_month": comparison_data[0]["month"] if comparison_data else None,
                "end_month": comparison_data[-1]["month"] if comparison_data else None
            },
            "overall_trend_percent": round(overall_trend, 2),
            "summary": history.get("summary", {}),
            "monthly_comparison": comparison_data,
            "generated_at": datetime.now(timezone.utc)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating usage comparison: {str(e)}"
        )

@router.get("/export/{format}")
async def export_usage_data(
    format: str,  # "csv" or "json"
    tenant_id: Optional[str] = None,
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    year: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Export usage data in CSV or JSON format (super_admin only)
    
    Examples:
    - GET /token-usage/export/csv?year=2024 (all tenants for 2024 in CSV)
    - GET /token-usage/export/json?tenant_id=123&start_month=2025-01&end_month=2025-06
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can export usage data"
        )
    
    if format not in ["csv", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format must be 'csv' or 'json'"
        )
    
    try:
        if tenant_id:
            # Export specific tenant data
            data = await token_logger.get_tenant_historical_usage(
                tenant_id=tenant_id,
                start_month=start_month,
                end_month=end_month,
                year=year
            )
            export_data = data.get("monthly_breakdown", [])
        else:
            # Export all tenants data
            data = await token_logger.get_super_admin_historical_report(
                start_month=start_month,
                end_month=end_month,
                year=year
            )
            
            # Flatten tenant data for export
            export_data = []
            for tenant_id, tenant_data in data.get("tenants", {}).items():
                for month, month_data in tenant_data.get("months", {}).items():
                    export_data.append({
                        "tenant_id": tenant_id,
                        "tenant_name": tenant_data["tenant_name"],
                        "month": month,
                        "llm_tokens": month_data["llm_tokens"],
                        "embedding_tokens": month_data["embedding_tokens"],
                        "total_tokens": month_data["total_tokens"]
                    })
        
        if format == "csv":
            # Create CSV content
            output = io.StringIO()
            if export_data:
                fieldnames = export_data[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(export_data)
            
            output.seek(0)
            
            # Return CSV as download
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=token_usage_export_{datetime.now().strftime('%Y%m%d')}.csv"}
            )
        
        else:  # JSON format
            return JSONResponse({
                "export_info": {
                    "exported_at": datetime.now(timezone.utc).isoformat(),
                    "format": "json",
                    "record_count": len(export_data),
                    "filters": {
                        "tenant_id": tenant_id,
                        "start_month": start_month,
                        "end_month": end_month,
                        "year": year
                    }
                },
                "data": export_data
            })
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting usage data: {str(e)}"
        )
#########

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
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view all tenant usage"
        )
    
    try:
        current_month = datetime.utcnow().strftime("%Y-%m")
        tenants_collection = db["tenants"]
        token_usage_collection = db["tenant_token_usage"]
        users_collection = db["users"]  # ADD THIS LINE
        
        # Get all tenants
        tenants = list(tenants_collection.find({}, {"_id": 1, "name": 1, "token_limit_millions": 1}))
        
        usage_data = []
        for tenant in tenants:
            tenant_id = str(tenant["_id"])
            usage = await token_logger.get_tenant_usage_summary(tenant_id, current_month)
            
            # ADD THIS: Get actual user count for this tenant
            user_count = users_collection.count_documents({"tenant_id": ObjectId(tenant_id)})
            
            usage_data.append({
                "tenant_id": tenant_id,
                "tenant_name": tenant["name"],
                "usage": usage,
                "user_count": user_count  # ADD THIS LINE
            })
        
        # ADD THIS: Also count super_admin users (tenant_id = null)
        super_admin_count = users_collection.count_documents({"tenant_id": None})
        
        return {
            "month": current_month,
            "tenants": usage_data,
            "total_tenants": len(usage_data),
            "super_admin_users": super_admin_count,  # ADD THIS LINE
            "total_users": sum(tenant["user_count"] for tenant in usage_data) + super_admin_count  # ADD THIS LINE
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