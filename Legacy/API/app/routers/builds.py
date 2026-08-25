from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..db import get_db
from ..models.build import MyFrame, Loadout

router = APIRouter(
    prefix="/builds",
    tags=["builds"],
    responses={404: {"description": "Not found"}},
)

@router.get("/frames", response_model=List[MyFrame])
def read_frame_builds(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_user].[MyFrames] ORDER BY CreatedAt DESC OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
    result = db.execute(query, {"skip": skip, "limit": limit}).fetchall()
    return result

@router.get("/loadouts", response_model=List[Loadout])
def read_loadouts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_user].[Loadouts] ORDER BY CreatedAt DESC OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
    result = db.execute(query, {"skip": skip, "limit": limit}).fetchall()
    return result
