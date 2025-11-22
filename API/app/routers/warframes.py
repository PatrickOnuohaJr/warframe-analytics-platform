from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..db import get_db
from ..models.warframe import Warframe

router = APIRouter(
    prefix="/warframes",
    tags=["warframes"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Warframe])
def read_warframes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Warframes] ORDER BY Name OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
    result = db.execute(query, {"skip": skip, "limit": limit}).fetchall()
    return result

@router.get("/{warframe_id}", response_model=Warframe)
def read_warframe(warframe_id: int, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Warframes] WHERE WarframeId = :id")
    result = db.execute(query, {"id": warframe_id}).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Warframe not found")
    return result
