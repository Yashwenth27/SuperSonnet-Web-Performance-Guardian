import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from app.database import Base

class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    lcp = Column(Float, nullable=True)
    cls = Column(Float, nullable=True)
    fid = Column(Float, nullable=True)
    fcp = Column(Float, nullable=True)
    load_time = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class JavaScriptError(Base):
    __tablename__ = "javascript_errors"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True)
    message = Column(Text)
    stack_trace = Column(Text, nullable=True)
    browser_info = Column(String, nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditReport(Base):
    __tablename__ = "audit_reports"

    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String, nullable=True)
    repo_path = Column(String, nullable=True)
    risk_level = Column(String)  # GREEN, AMBER, RED
    score = Column(Integer)       # 0 to 100
    issues = Column(Text)         # JSON string list of issues
    code_fixes = Column(Text)     # JSON string list of proposed code improvements
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String)       # "user" or "agent"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
