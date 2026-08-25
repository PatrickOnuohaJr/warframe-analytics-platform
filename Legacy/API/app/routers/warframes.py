from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from ..db import get_db
from ..models.warframe import Warframe

router = APIRouter(
    prefix="/warframes",
    tags=["warframes"],
    responses={404: {"description": "Not found"}},
)

# ---------------------------
# List Warframes (with filters)
# ---------------------------
@router.get("/", response_model=List[Warframe])
def read_warframes(
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = None,
    min_armor: Optional[int] = None,
    max_armor: Optional[int] = None,
    min_health: Optional[int] = None,
    max_health: Optional[int] = None,
    min_shields: Optional[int] = None,
    max_shields: Optional[int] = None,
    sort: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns a list of Warframes with optional filtering and sorting.
    """

    base_query = "SELECT * FROM [wf_base].[Warframes]"
    conditions = []
    params: dict = {}

    # ----- Filters -----
    if name:
        conditions.append("Name LIKE :name")
        params["name"] = f"%{name}%"

    if min_armor is not None:
        conditions.append("Armor >= :min_armor")
        params["min_armor"] = min_armor

    if max_armor is not None:
        conditions.append("Armor <= :max_armor")
        params["max_armor"] = max_armor

    if min_health is not None:
        conditions.append("Health >= :min_health")
        params["min_health"] = min_health

    if max_health is not None:
        conditions.append("Health <= :max_health")
        params["max_health"] = max_health

    if min_shields is not None:
        conditions.append("Shields >= :min_shields")
        params["min_shields"] = min_shields

    if max_shields is not None:
        conditions.append("Shields <= :max_shields")
        params["max_shields"] = max_shields

    # Build WHERE clause
    query = base_query
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    # ----- Sorting -----
    allowed_sort_fields = {
        "name": "Name",
        "armor": "Armor",
        "health": "Health",
        "shields": "Shields",
        "energy": "Energy",
        "sprintspeed": "SprintSpeed",
    }

    order_clause = " ORDER BY Name"  # default

    if sort:
        direction = "ASC"
        field_key = sort

        if sort.startswith("-"):
            direction = "DESC"
            field_key = sort[1:]

        column = allowed_sort_fields.get(field_key.lower())
        if column:
            order_clause = f" ORDER BY {column} {direction}"

    query += order_clause

    # ----- Pagination -----
    query += " OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"
    params["skip"] = skip
    params["limit"] = limit

    try:
        # TEMP debug prints – will show up in your Uvicorn terminal
        print("FINAL SQL:", query)
        print("PARAMS:", params)

        result = db.execute(text(query), params).fetchall()
        return result

    except Exception as e:
        # Let’s see SQL Server’s real complaint instead of a blank 500
        print("ERROR executing warframes query:", e)
        raise HTTPException(status_code=500, detail=str(e))