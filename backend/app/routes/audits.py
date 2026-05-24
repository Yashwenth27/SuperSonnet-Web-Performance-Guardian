import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas, models
from app.agent import CompliancePerformanceAgent

router = APIRouter(
    prefix="/audits",
    tags=["audits"]
)

agent = CompliancePerformanceAgent()

@router.post("/snippet", response_model=schemas.AuditReportOut)
def audit_code_snippet(payload: schemas.SnippetAuditRequest, db: Session = Depends(get_db)):
    """
    Submit a frontend code snippet (HTML/JSX/JS/CSS) to be audited by the AI performance compliance agent.
    """
    try:
        # Run agent audit
        result = agent.audit_code_snippet(payload.code_snippet, payload.filename)
        
        # Save to database
        db_report = schemas.AuditReportCreate(
            target_url=None,
            repo_path=payload.filename,
            risk_level=result["risk_level"],
            score=result["score"],
            issues=json.dumps(result.get("issues", [])),
            code_fixes=json.dumps(result.get("code_fixes", []))
        )
        saved_report = crud.create_audit_report(db=db, report=db_report)
        return crud.parse_report_orm(saved_report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

@router.post("/repo", response_model=schemas.AuditReportOut)
def audit_repository(payload: schemas.RepoAuditRequest, db: Session = Depends(get_db)):
    """
    Simulate auditing an entire workspace repository or single URL.
    Scans files and integrates them into a unified report.
    """
    try:
        # Simulated source code representative of common performance issues in SMEs
        sample_code = """
import React, { useEffect, useState } from 'react';
import * as lodash from 'lodash';

export default function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // Heavy calculations / sync fetching
    fetch('http://localhost:8000/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
      
    // Missing cleanup event listener
    window.addEventListener('scroll', () => {
      console.log('scrolling...');
    });
  }, []);

  return (
    <div className="container">
      <h1>Active Users</h1>
      {/* Heavy image with no width/height and no lazy load */}
      <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e" />
      
      <ul>
        {lodash.map(users, user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
"""
        # Run agent audit on the simulated codebase
        filename = "UserList.jsx"
        result = agent.audit_code_snippet(sample_code, filename)
        
        db_report = schemas.AuditReportCreate(
            target_url=payload.target_url or "http://localhost:3000",
            repo_path=payload.repo_path,
            risk_level=result["risk_level"],
            score=result["score"],
            issues=json.dumps(result.get("issues", [])),
            code_fixes=json.dumps(result.get("code_fixes", []))
        )
        saved_report = crud.create_audit_report(db=db, report=db_report)
        return crud.parse_report_orm(saved_report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Repository audit failed: {str(e)}")

@router.get("", response_model=List[schemas.AuditReportOut])
def get_all_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List past performance compliance audits.
    """
    try:
        return crud.get_audit_reports(db=db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{report_id}", response_model=schemas.AuditReportOut)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    """
    Get audit details for a specific compliance report.
    """
    report = crud.get_audit_report_by_id(db=db, report_id=report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Audit report not found")
    return report
