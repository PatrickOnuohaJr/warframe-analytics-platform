from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from ..db import get_db
from ..models.weapon import Weapon

router = APIRouter(
    prefix="/weapons",
    tags=["weapons"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Weapon])
def read_weapons(
    skip: int = 0, 
    limit: int = 100, 
    type: Optional[str] = Query(None, description="Filter by weapon type (e.g., Primary, Secondary, Melee)"),
    db: Session = Depends(get_db)
):
    if type:
        query = text("SELECT * FROM [wf_base].[Weapons] WHERE Type = :type ORDER BY Name OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
        params = {"skip": skip, "limit": limit, "type": type}
    else:
        query = text("SELECT * FROM [wf_base].[Weapons] ORDER BY Name OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY")
        params = {"skip": skip, "limit": limit}
        
    result = db.execute(query, params).fetchall()
    return result

@router.get("/{weapon_id}", response_model=Weapon)
def read_weapon(weapon_id: int, db: Session = Depends(get_db)):
    query = text("SELECT * FROM [wf_base].[Weapons] WHERE WeaponId = :id")
    result = db.execute(query, {"id": weapon_id}).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Weapon not found")
    return result
