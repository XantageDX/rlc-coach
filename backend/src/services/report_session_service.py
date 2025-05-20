# report_session_service.py
from typing import Dict, Any, Optional

# Store report sessions by session ID
_report_sessions = {}

def get_report_session(session_id: Optional[str] = None, report_id: Optional[str] = None, report_type: str = 'kg'):
    """
    Get or create a session for a specific report.
    
    Args:
        session_id: Unique identifier for this report writing session
        report_id: ID of the report being edited
        report_type: Type of report ('kg' or 'kd')
    """
    global _report_sessions
    
    # If no session ID provided, use a fallback based on report
    if not session_id:
        session_id = f"{report_type}_{report_id or 'default'}"
    
    # If this session doesn't exist, create a new one
    if session_id not in _report_sessions:
        _report_sessions[session_id] = {
            "report_id": report_id,
            "report_type": report_type,
            "messages": [],
            "context": {}
        }
        print(f"Created new report session: {session_id}")
    
    return _report_sessions[session_id]

def update_report_session(session_id: str, data: Dict[str, Any]):
    """Update an existing report session with new data."""
    global _report_sessions
    
    if session_id in _report_sessions:
        _report_sessions[session_id].update(data)
        return True
    return False

def clear_report_session(session_id: Optional[str] = None, report_id: Optional[str] = None, report_type: str = 'kg'):
    """Clear the session for a specific report."""
    global _report_sessions
    
    # If session ID is provided, clear that specific session
    if session_id and session_id in _report_sessions:
        del _report_sessions[session_id]
        print(f"Cleared report session by ID: {session_id}")
        return True
    
    # Fallback: if no session ID but report_id is provided, try to find and clear by report details
    if not session_id and report_id:
        fallback_key = f"{report_type}_{report_id}"
        if fallback_key in _report_sessions:
            del _report_sessions[fallback_key]
            print(f"Cleared report session by fallback key: {fallback_key}")
            return True
    
    return False

def get_all_sessions():
    """Return all active report sessions (for debugging)."""
    return _report_sessions