#### PHASE 5.2 ####
from typing import Dict, Any, Optional
from datetime import datetime

# Store report sessions by session ID
_report_sessions = {}

def get_report_session(session_id: Optional[str] = None, report_id: Optional[str] = None, report_type: str = 'kg', tenant_id: Optional[str] = None, user_email: Optional[str] = None):
    """
    Get or create a session for a specific report with ENFORCED tenant+user isolation.
    PHASE 5.2: Enhanced with mandatory tenant+user scoping for complete security.
    
    Args:
        session_id: Unique identifier for this report writing session
        report_id: ID of the report being edited
        report_type: Type of report ('kg' or 'kd')
        tenant_id: Tenant identifier for session isolation (CRITICAL for security)
    """
    global _report_sessions
    
    
    # PHASE 5.2 SECURITY: Create tenant+user-scoped session key for complete isolation
    if tenant_id and user_email:
        # Full isolation: tenant_{tenant_id}_user_{user_email}_{session_id}
        if not session_id:
            session_id = f"{report_type}_{report_id or 'default'}"
        scoped_session_id = f"tenant_{tenant_id}_user_{user_email}_{session_id}"
        isolation_level = "tenant_user_scoped"
    elif tenant_id:
        # Fallback: tenant-only scoping (for backwards compatibility)
        if not session_id:
            session_id = f"{report_type}_{report_id or 'default'}"
        scoped_session_id = f"tenant_{tenant_id}_{session_id}"
        isolation_level = "tenant_scoped"
    else:
        # Super admin global session: global_{session_id}
        if not session_id:
            session_id = f"{report_type}_{report_id or 'default'}"
        scoped_session_id = f"global_{session_id}"
        isolation_level = "global"
        print("⚠️ WARNING: Creating global report session - should only be used by super admin")
    
    # If this session doesn't exist, create a new one
    if scoped_session_id not in _report_sessions:
        _report_sessions[scoped_session_id] = {
            "original_session_id": session_id,
            "scoped_session_id": scoped_session_id,
            "report_id": report_id,
            "report_type": report_type,
            "tenant_id": tenant_id,
            "isolation_level": isolation_level,
            "messages": [],
            "context": {},
            "created_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat()
        }
        print(f"🔒 Created new report session: {scoped_session_id} (isolation: {isolation_level})")
    else:
        # Update last accessed timestamp
        _report_sessions[scoped_session_id]["last_accessed"] = datetime.utcnow().isoformat()
    
    return _report_sessions[scoped_session_id]

# def update_report_session(session_id: str, data: Dict[str, Any], tenant_id: Optional[str] = None):
def update_report_session(session_id: str, data: Dict[str, Any], tenant_id: Optional[str] = None, user_email: Optional[str] = None):
    """
    Update an existing report session with ENFORCED tenant isolation.
    PHASE 5.2: Enhanced with tenant validation.
    """
    global _report_sessions
    
    # PHASE 5.2 SECURITY: Create tenant+user-scoped session key for complete isolation
    if tenant_id and user_email:
        scoped_session_id = f"tenant_{tenant_id}_user_{user_email}_{session_id}"
    elif tenant_id:
        scoped_session_id = f"tenant_{tenant_id}_{session_id}"
    else:
        scoped_session_id = f"global_{session_id}"
    
    if scoped_session_id in _report_sessions:
        # PHASE 5.2 SECURITY: Validate tenant access
        existing_session = _report_sessions[scoped_session_id]
        if existing_session.get("tenant_id") != tenant_id:
            print(f"❌ Tenant {tenant_id} attempted to access session owned by {existing_session.get('tenant_id')}")
            return False
        
        # Update session data
        _report_sessions[scoped_session_id].update(data)
        _report_sessions[scoped_session_id]["last_accessed"] = datetime.utcnow().isoformat()
        print(f"✅ Updated report session: {scoped_session_id}")
        return True
    
    print(f"⚠️ Session not found for update: {scoped_session_id}")
    return False

# def clear_report_session(session_id: Optional[str] = None, report_id: Optional[str] = None, report_type: str = 'kg', tenant_id: Optional[str] = None):
def clear_report_session(session_id: Optional[str] = None, report_id: Optional[str] = None, report_type: str = 'kg', tenant_id: Optional[str] = None, user_email: Optional[str] = None):
    """
    Clear the session for a specific report with ENFORCED tenant isolation.
    PHASE 5.2: Enhanced with tenant validation and security logging.
    """
    global _report_sessions
    
    # PHASE 5.2 SECURITY: Handle different clearing scenarios
    if session_id:
        # Clear specific session with tenant+user scoping for complete isolation
        if tenant_id and user_email:
            scoped_session_id = f"tenant_{tenant_id}_user_{user_email}_{session_id}"
        elif tenant_id:
            scoped_session_id = f"tenant_{tenant_id}_{session_id}"
        else:
            scoped_session_id = f"global_{session_id}"
        
        if scoped_session_id in _report_sessions:
            # PHASE 5.2 SECURITY: Validate tenant access
            existing_session = _report_sessions[scoped_session_id]
            if existing_session.get("tenant_id") != tenant_id:
                print(f"❌ Tenant {tenant_id} attempted to clear session owned by {existing_session.get('tenant_id')}")
                return False
            
            del _report_sessions[scoped_session_id]
            print(f"🗑️ Cleared report session by ID: {scoped_session_id}")
            return True
    
    # Fallback: clear by report details with tenant scoping
    if not session_id and report_id:
        fallback_session_id = f"{report_type}_{report_id}"
        
        if tenant_id and user_email:
            scoped_fallback_id = f"tenant_{tenant_id}_user_{user_email}_{fallback_session_id}"
        elif tenant_id:
            scoped_fallback_id = f"tenant_{tenant_id}_{fallback_session_id}"
        else:
            scoped_fallback_id = f"global_{fallback_session_id}"
        
        if scoped_fallback_id in _report_sessions:
            # PHASE 5.2 SECURITY: Validate tenant access
            existing_session = _report_sessions[scoped_fallback_id]
            if existing_session.get("tenant_id") != tenant_id:
                print(f"❌ Tenant {tenant_id} attempted to clear session owned by {existing_session.get('tenant_id')}")
                return False
            
            del _report_sessions[scoped_fallback_id]
            print(f"🗑️ Cleared report session by fallback: {scoped_fallback_id}")
            return True
    
    return False

def clear_all_tenant_sessions(tenant_id: Optional[str] = None):
    """
    Clear all sessions for a specific tenant with enhanced security.
    PHASE 5.2: Bulk session clearing with tenant isolation.
    """
    global _report_sessions
    
    if tenant_id:
        # Clear all sessions for a specific tenant
        prefix = f"tenant_{tenant_id}_"
        keys_to_remove = [key for key in _report_sessions.keys() if key.startswith(prefix)]
        operation_type = f"Tenant {tenant_id} bulk clear"
    else:
        # Super admin clearing all global sessions
        keys_to_remove = [key for key in _report_sessions.keys() if key.startswith("global_")]
        operation_type = "Super admin global bulk clear"
    
    # Security audit log
    print(f"🔥 {operation_type}: Clearing {len(keys_to_remove)} report sessions")
    
    for key in keys_to_remove:
        session_info = _report_sessions[key]
        print(f"🗑️ Removing report session: {key} (report_type: {session_info.get('report_type')}, report_id: {session_info.get('report_id')})")
        del _report_sessions[key]
    
    result = {
        "cleared_count": len(keys_to_remove),
        "tenant_id": tenant_id,
        "operation_type": operation_type,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    print(f"✅ Bulk session clear completed: {result}")
    return result

def validate_session_access(session_id: str, requesting_tenant_id: str, target_tenant_id: str = None):
    """
    NEW: PHASE 5.2 - Validate that a tenant can access a specific report session.
    
    Args:
        session_id: The session being accessed
        requesting_tenant_id: Tenant making the request
        target_tenant_id: Tenant that owns the session (if different)
    
    Returns:
        Dict with validation results
    """
    # Super admin can access any session
    if requesting_tenant_id is None:
        return {
            "allowed": True,
            "reason": "Super admin access",
            "access_level": "global"
        }
    
    # If no target specified, assume requesting their own session
    if target_tenant_id is None:
        target_tenant_id = requesting_tenant_id
    
    # Tenants can only access their own sessions
    if requesting_tenant_id == target_tenant_id:
        return {
            "allowed": True,
            "reason": "Tenant accessing own session",
            "access_level": "tenant_scoped"
        }
    else:
        return {
            "allowed": False,
            "reason": f"Tenant {requesting_tenant_id} cannot access tenant {target_tenant_id} sessions",
            "access_level": "denied"
        }

def get_session_statistics(tenant_id: Optional[str] = None):
    """
    NEW: PHASE 5.2 - Get session usage statistics with tenant isolation.
    """
    global _report_sessions
    
    stats = {
        "total_sessions": 0,
        "kg_sessions": 0,
        "kd_sessions": 0,
        "tenant_sessions": 0,
        "global_sessions": 0,
        "requesting_tenant": tenant_id,
        "session_breakdown": {}
    }
    
    for scoped_session_id, session_data in _report_sessions.items():
        include_in_stats = False
        
        if scoped_session_id.startswith("tenant_"):
            session_tenant_id = session_data.get("tenant_id")
            if tenant_id is None or tenant_id == session_tenant_id:
                include_in_stats = True
                stats["tenant_sessions"] += 1
                
        elif scoped_session_id.startswith("global_"):
            if tenant_id is None:  # Only super admin sees global stats
                include_in_stats = True
                stats["global_sessions"] += 1
        
        if include_in_stats:
            stats["total_sessions"] += 1
            report_type = session_data.get("report_type", "unknown")
            
            if report_type == "kg":
                stats["kg_sessions"] += 1
            elif report_type == "kd":
                stats["kd_sessions"] += 1
            
            # Track per-tenant breakdown for super admin
            if tenant_id is None and session_data.get("tenant_id"):
                session_tenant = session_data.get("tenant_id")
                if session_tenant not in stats["session_breakdown"]:
                    stats["session_breakdown"][session_tenant] = 0
                stats["session_breakdown"][session_tenant] += 1
    
    return stats