import json
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app import models, schemas

# Performance Metrics CRUD
def create_performance_metric(db: Session, metric: schemas.PerformanceMetricCreate):
    db_metric = models.PerformanceMetric(
        url=metric.url,
        lcp=metric.lcp,
        cls=metric.cls,
        fid=metric.fid,
        fcp=metric.fcp,
        load_time=metric.load_time
    )
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

def get_performance_metrics(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.PerformanceMetric).order_by(desc(models.PerformanceMetric.created_at)).offset(skip).limit(limit).all()

def get_metrics_by_url(db: Session, url: str):
    return db.query(models.PerformanceMetric).filter(models.PerformanceMetric.url == url).order_by(models.PerformanceMetric.created_at).all()

# JavaScript Errors CRUD
def create_js_error(db: Session, error: schemas.JavaScriptErrorCreate):
    db_error = models.JavaScriptError(
        url=error.url,
        message=error.message,
        stack_trace=error.stack_trace,
        browser_info=error.browser_info
    )
    db.add(db_error)
    db.commit()
    db.refresh(db_error)
    return db_error

def get_js_errors(db: Session, include_resolved: bool = False, skip: int = 0, limit: int = 100):
    query = db.query(models.JavaScriptError)
    if not include_resolved:
        query = query.filter(models.JavaScriptError.resolved == False)
    return query.order_by(desc(models.JavaScriptError.created_at)).offset(skip).limit(limit).all()

def resolve_js_error(db: Session, error_id: int):
    db_error = db.query(models.JavaScriptError).filter(models.JavaScriptError.id == error_id).first()
    if db_error:
        db_error.resolved = True
        db.commit()
        db.refresh(db_error)
    return db_error

# Audit Reports CRUD
def create_audit_report(db: Session, report: schemas.AuditReportCreate):
    db_report = models.AuditReport(
        target_url=report.target_url,
        repo_path=report.repo_path,
        risk_level=report.risk_level,
        score=report.score,
        issues=report.issues,
        code_fixes=report.code_fixes
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_audit_reports(db: Session, skip: int = 0, limit: int = 100):
    reports = db.query(models.AuditReport).order_by(desc(models.AuditReport.created_at)).offset(skip).limit(limit).all()
    # Format issues/fixes columns from JSON strings to lists
    formatted = []
    for r in reports:
        formatted.append(parse_report_orm(r))
    return formatted

def get_audit_report_by_id(db: Session, report_id: int):
    report = db.query(models.AuditReport).filter(models.AuditReport.id == report_id).first()
    if report:
        return parse_report_orm(report)
    return None

def parse_report_orm(report: models.AuditReport):
    # Parse issues & code_fixes from stringified JSON to proper lists
    try:
        issues_list = json.loads(report.issues)
    except:
        issues_list = []
    
    try:
        fixes_list = json.loads(report.code_fixes)
    except:
        fixes_list = []
        
    return {
        "id": report.id,
        "target_url": report.target_url,
        "repo_path": report.repo_path,
        "risk_level": report.risk_level,
        "score": report.score,
        "issues": issues_list,
        "code_fixes": fixes_list,
        "created_at": report.created_at
    }

# Chat Message CRUD
def create_chat_message(db: Session, msg: schemas.ChatMessageCreate):
    db_msg = models.ChatMessage(sender=msg.sender, content=msg.content)
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def get_chat_messages(db: Session, limit: int = 50):
    return db.query(models.ChatMessage).order_by(models.ChatMessage.created_at).limit(limit).all()

def delete_all_metrics(db: Session):
    count = db.query(models.PerformanceMetric).delete()
    db.commit()
    return count

def delete_all_errors(db: Session):
    count = db.query(models.JavaScriptError).delete()
    db.commit()
    return count
