from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from ..db import get_db
from ..models.arcane import Arcane

router = APIRouter(
    prefix="/arcanes",
    tags=["arcanes"],
    responses={404: {"description": "Not found"}},
)


# ---------------------------
# List Arcanes (with filters)
# ---------------------------
@router.get("/", response_model=List[Arcane])
def read_arcanes(
    skip: int = 0,
    limit: int = 100,
    name: Optional[str] = Query(
        None, description="Filter by arcane name (contains, case-insensitive depending on collation)"
    ),
    type: Optional[str] = Query(
        None, description="Filter by arcane item type (e.g., Warframe, Primary, Melee, Operator)"
    ),
    min_rank: Optional[int] = Query(
        None, description="Minimum MaxRank (MaxRank >= this value)"
    ),
    max_rank: Optional[int] = Query(
        None, description="Maximum MaxRank (MaxRank <= this value)"
    ),
    # NOTE: Rarity is stored inside RawJson as JSON, not as a separate column.
    # We’ll skip rarity filtering for now to keep Phase 4 simple.
    sort: Optional[str] = Query(
        None,
        description="Sort field. Allowed: name, rankmax, id, type. "
                    "Prefix with '-' for descending (e.g., -rankmax).",
    ),
    db: Session = Depends(get_db),
):
    """
    Returns a list of Arcanes with optional filtering and sorting.

    Query examples:
    - /arcanes?skip=0&limit=20
    - /arcanes?type=Warframe
    - /arcanes?name=Guardian
    - /arcanes?min_rank=3&sort=-rankmax
    """

    # Base SELECT – use the real column names from [wf_base].[Arcanes]
    query = "SELECT * FROM [wf_base].[Arcanes]"
    conditions = []
    params: dict = {"skip": skip, "limit": limit}

    # ----- Filters -----

    if name:
        # Name contains the value (LIKE)
        conditions.append("Name LIKE :name")
        params["name"] = f"%{name}%"

    if type:
        # ItemType column in the table (e.g., Warframe / Primary / Melee / Operator)
        conditions.append("ItemType = :type")
        params["type"] = type

    if min_rank is not None:
        # MaxRank >= min_rank
        conditions.append("MaxRank >= :min_rank")
        params["min_rank"] = min_rank

    if max_rank is not None:
        # MaxRank <= max_rank
        conditions.append("MaxRank <= :max_rank")
        params["max_rank"] = max_rank

    # If we added any filters, append WHERE ...
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    # ----- Sorting -----
    # Allowed sort fields → actual DB column names
    allowed_sort_fields = {
        "name": "Name",
        "rankmax": "MaxRank",
        "id": "ArcaneId",
        "type": "ItemType",
        # "rarity": "JSON_VALUE(RawJson, '$.rarity')"  # possible future enhancement
    }

    order_clause = " ORDER BY Name"  # default sort

    if sort:
        direction = "ASC"
        field_key = sort

        # sort=-rankmax → field=rankmax, direction=DESC
        if sort.startswith("-"):
            direction = "DESC"
            field_key = sort[1:]

        column = allowed_sort_fields.get(field_key.lower())
        if column:
            order_clause = f" ORDER BY {column} {direction}"

    query += order_clause

    # ----- Pagination -----
    query += " OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"

    try:
        # Debug prints (optional) – show in Uvicorn terminal
        print("FINAL SQL:", query)
        print("PARAMS:", params)

        result = db.execute(text(query), params).fetchall()
        return result

    except Exception as e:
        # Bubble up the real SQL error instead of a blank 500
        print("ERROR executing arcanes query:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Get a single Arcane by ID
# ---------------------------
@router.get("/{arcane_id}", response_model=Arcane)
def read_arcane(arcane_id: int, db: Session = Depends(get_db)):
    query = text(
        "SELECT * FROM [wf_base].[Arcanes] WHERE ArcaneId = :id"
    )
    result = db.execute(query, {"id": arcane_id}).fetchone()

    if result is None:
        raise HTTPException(status_code=404, detail="Arcane not found")

    return result
