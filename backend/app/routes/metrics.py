from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas

router = APIRouter(
    prefix="/metrics",
    tags=["metrics"]
)

@router.post("", response_model=schemas.PerformanceMetricOut)
def record_metrics(metric: schemas.PerformanceMetricCreate, db: Session = Depends(get_db)):
    """
    Ingest performance metrics from the drop-in SDK or Chrome extension.
    """
    try:
        return crud.create_performance_metric(db=db, metric=metric)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[schemas.PerformanceMetricOut])
def list_metrics(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get a list of all logged performance metrics.
    """
    try:
        return crud.get_performance_metrics(db=db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-url", response_model=List[schemas.PerformanceMetricOut])
def get_metrics_by_url(url: str, db: Session = Depends(get_db)):
    """
    Get performance metrics specific to a route/URL.
    """
    try:
        return crud.get_metrics_by_url(db=db, url=url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("")
def clear_all_metrics(db: Session = Depends(get_db)):
    """Delete all performance metrics (reset dashboard)."""
    count = crud.delete_all_metrics(db=db)
    return {"deleted": count}
