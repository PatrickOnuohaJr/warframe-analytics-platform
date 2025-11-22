from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..db import get_db
from ..models.arcane import Arcane

router = APIRouter(
    prefix="/arcanes",
    tags=["arcanes"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Arcane])
def read_arcanes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Arcanes] ORDER BY Name OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
    result = db.execute(query, {"skip": skip, "limit": limit}).fetchall()
    return result

@router.get("/{arcane_id}", response_model=Arcane)
def read_arcane(arcane_id: int, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Arcanes] WHERE ArcaneId = :id")
    result = db.execute(query, {"id": arcane_id}).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Arcane not found")
    return result
