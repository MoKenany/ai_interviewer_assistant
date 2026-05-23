from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.audit_log import AuditActionEnum

class AuditLogCreate(BaseModel):
    user_id: Optional[int] = None
    action: AuditActionEnum
    resource_type: str
    resource_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None
    action: AuditActionEnum
    resource_type: str
    resource_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
