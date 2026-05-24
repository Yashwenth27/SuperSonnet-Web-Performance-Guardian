from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Performance Metrics Schemas
class PerformanceMetricCreate(BaseModel):
    url: str
    lcp: Optional[float] = None
    cls: Optional[float] = None
    fid: Optional[float] = None
    fcp: Optional[float] = None
    load_time: Optional[float] = None

class PerformanceMetricOut(PerformanceMetricCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# JavaScript Error Schemas
class JavaScriptErrorCreate(BaseModel):
    url: str
    message: str
    stack_trace: Optional[str] = None
    browser_info: Optional[str] = None

class JavaScriptErrorOut(JavaScriptErrorCreate):
    id: int
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Audit Report Schemas
class AuditReportCreate(BaseModel):
    target_url: Optional[str] = None
    repo_path: Optional[str] = None
    risk_level: str
    score: int
    issues: str  # JSON Stringified List
    code_fixes: str  # JSON Stringified List

class AuditReportOut(BaseModel):
    id: int
    target_url: Optional[str]
    repo_path: Optional[str]
    risk_level: str
    score: int
    issues: List[Dict[str, Any]]
    code_fixes: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

# Chat Message Schemas
class ChatMessageCreate(BaseModel):
    sender: str
    content: str

class ChatMessageOut(ChatMessageCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Custom Audit Request Inputs
class SnippetAuditRequest(BaseModel):
    code_snippet: str
    filename: Optional[str] = "Component.jsx"

class RepoAuditRequest(BaseModel):
    repo_path: str
    target_url: Optional[str] = None
