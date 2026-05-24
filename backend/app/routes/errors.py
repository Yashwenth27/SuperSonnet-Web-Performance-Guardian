from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas

router = APIRouter(
    prefix="/errors",
    tags=["errors"]
)

@router.post("", response_model=schemas.JavaScriptErrorOut)
def record_error(error: schemas.JavaScriptErrorCreate, db: Session = Depends(get_db)):
    """
    Log an uncaught javascript runtime error or promise rejection.
    """
    try:
        return crud.create_js_error(db=db, error=error)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[schemas.JavaScriptErrorOut])
def list_errors(include_resolved: bool = False, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get a list of logged errors.
    """
    try:
        return crud.get_js_errors(db=db, include_resolved=include_resolved, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{error_id}/resolve", response_model=schemas.JavaScriptErrorOut)
def resolve_error(error_id: int, db: Session = Depends(get_db)):
    """
    Mark an active error as resolved.
    """
    resolved = crud.resolve_js_error(db=db, error_id=error_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="Error trace not found")
    return resolved

@router.delete("")
def clear_all_errors(db: Session = Depends(get_db)):
    """Delete all error logs (reset dashboard)."""
    count = crud.delete_all_errors(db=db)
    return {"deleted": count}
