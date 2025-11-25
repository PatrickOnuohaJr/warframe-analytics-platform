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
    name: Optional[str] = None,
    type: Optional[str] = Query(
        None,
        description="Filter by weapon type (e.g., Primary, Secondary, Melee)",
    ),
    min_mastery: Optional[int] = None,
    max_mastery: Optional[int] = None,
    min_damage: Optional[float] = None,
    max_damage: Optional[float] = None,
    min_crit: Optional[float] = None,
    max_crit: Optional[float] = None,
    min_status: Optional[float] = None,
    max_status: Optional[float] = None,
    sort: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns a list of Weapons with optional filtering and sorting.

    Query examples:
    - /weapons?skip=0&limit=20
    - /weapons?type=Primary
    - /weapons?name=Braton
    - /weapons?min_mastery=10&sort=-mastery
    - /weapons?min_damage=200&sort=-damage
    """

    # ---- Base query ----
    query = "SELECT * FROM [wf_base].[Weapons]"
    conditions = []
    params: dict = {"skip": skip, "limit": limit}

    # ---- Filters ----
    if name:
        conditions.append("Name LIKE :name")
        params["name"] = f"%{name}%"

    if type:
        conditions.append("Type = :type")
        params["type"] = type

    # TODO: update column names below to match your table
    # e.g. MasteryRank / MasteryReq, TotalDamage, CritChance, StatusChance
    if min_mastery is not None:
        conditions.append("MasteryReq >= :min_mastery")
        params["min_mastery"] = min_mastery

    if max_mastery is not None:
        conditions.append("MasteryReq <= :max_mastery")
        params["max_mastery"] = max_mastery

    if min_damage is not None:
        conditions.append("TotalDamage >= :min_damage")
        params["min_damage"] = min_damage

    if max_damage is not None:
        conditions.append("TotalDamage <= :max_damage")
        params["max_damage"] = max_damage

    if min_crit is not None:
        conditions.append("CritChance >= :min_crit")
        params["min_crit"] = min_crit

    if max_crit is not None:
        conditions.append("CritChance <= :max_crit")
        params["max_crit"] = max_crit

    if min_status is not None:
        conditions.append("StatusChance >= :min_status")
        params["min_status"] = min_status

    if max_status is not None:
        conditions.append("StatusChance <= :max_status")
        params["max_status"] = max_status

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    # ---- Sorting ----
    allowed_sort_fields = {
        "name": "Name",
        "type": "Type",
        "mastery": "MasteryReq",      # check this column name in SSMS
        "damage": "TotalDamage",      # check this too
        "crit": "CritChance",
        "status": "StatusChance",
    }

    order_clause = " ORDER BY Name"  # default sort

    if sort:
        direction = "ASC"
        field_key = sort

        # e.g. sort=-damage → DESC
        if sort.startswith("-"):
            direction = "DESC"
            field_key = sort[1:]

        column = allowed_sort_fields.get(field_key.lower())
        if column:
            order_clause = f" ORDER BY {column} {direction}"

    query += order_clause

    # ---- Pagination ----
    query += " OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"

    try:
        # Debug prints (show up in your Uvicorn logs)
        print("FINAL SQL (weapons):", query)
        print("PARAMS (weapons):", params)

        result = db.execute(text(query), params).fetchall()
        return result

    except Exception as e:
        print("ERROR executing weapons query:", e)
        raise HTTPException(status_code=500, detail=str(e))
