from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..db import get_db
from ..models.mod import Mod

router = APIRouter(
    prefix="/mods",
    tags=["mods"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Mod])
def read_mods(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Mods] ORDER BY Name OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
    result = db.execute(query, {"skip": skip, "limit": limit}).fetchall()
    return result

@router.get("/{mod_id}", response_model=Mod)
def read_mod(mod_id: int, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Mods] WHERE ModId = :id")
    result = db.execute(query, {"id": mod_id}).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Mod not found")
    return result
