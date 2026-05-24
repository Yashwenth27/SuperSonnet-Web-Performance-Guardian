from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas
from app.agent import CompliancePerformanceAgent

router = APIRouter(
    prefix="/agent",
    tags=["agent"]
)

agent = CompliancePerformanceAgent()

@router.post("/chat", response_model=schemas.ChatMessageOut)
def chat_with_agent(payload: schemas.ChatMessageCreate, db: Session = Depends(get_db)):
    """
    Chat with the Compliance Agent regarding optimization strategies, regressions, and Core Web Vitals.
    """
    try:
        # Save user message to database
        crud.create_chat_message(db=db, msg=payload)
        
        # Load conversation history from database
        history_msgs = crud.get_chat_messages(db=db, limit=20)
        history = [{"sender": m.sender, "content": m.content} for m in history_msgs]
        
        # Get AI response
        ai_response_content = agent.chat_with_agent(history=history, query=payload.content)
        
        # Save AI message to database
        ai_msg_create = schemas.ChatMessageCreate(sender="agent", content=ai_response_content)
        saved_ai_msg = crud.create_chat_message(db=db, msg=ai_msg_create)
        
        return saved_ai_msg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/history", response_model=List[schemas.ChatMessageOut])
def get_chat_history(db: Session = Depends(get_db)):
    """
    Get chat history logs.
    """
    try:
        return crud.get_chat_messages(db=db, limit=50)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
