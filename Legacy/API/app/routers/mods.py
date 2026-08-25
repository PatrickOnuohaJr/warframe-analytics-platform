from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from ..db import get_db
from ..models.mod import Mod

router = APIRouter(
    prefix="/mods",
    tags=["mods"],
    responses={404: {"description": "Not found"}},
)

# ----------------------------------------
# List Mods (with filtering + sorting)
# ----------------------------------------
@router.get("/", response_model=List[Mod])
def read_mods(
    skip: int = Query(0, ge=0, description="Number of rows to skip (pagination)"),
    limit: int = Query(100, ge=1, le=500, description="Max rows to return"),
    name: Optional[str] = Query(
        None,
        description="Filter by mod name (contains, case-insensitive depending on collation)",
    ),
    type: Optional[str] = Query(
        None,
        description="Filter by mod type (e.g., Warframe, Rifle, Melee, Shotgun)",
    ),
    polarity: Optional[str] = Query(
        None,
        description="Filter by polarity (e.g., Madurai, Naramon, Vazarin)",
    ),
    min_rank: Optional[int] = Query(
        None,
        ge=0,
        description="Minimum MaxRank",
    ),
    max_rank: Optional[int] = Query(
        None,
        ge=0,
        description="Maximum MaxRank",
    ),
    sort: Optional[str] = Query(
        None,
        description=(
            "Sort field. Allowed: name, type, polarity, maxrank, id. "
            "Prefix with '-' for descending (e.g., -maxrank)."
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Returns a list of Mods with optional filtering and sorting.

    Examples:
    - /mods?skip=0&limit=50
    - /mods?name=flow
    - /mods?type=Warframe&polarity=madurai
    - /mods?min_rank=5&max_rank=10&sort=-maxrank
    """

    base_query = "SELECT ModId, Name, ModType, Polarity, MaxRank, UniqueName, RawJson FROM [wf_base].[Mods]"
    conditions = []
    params: dict = {"skip": skip, "limit": limit}

    # ---------- Filters ----------
    if name:
        conditions.append("Name LIKE :name")
        params["name"] = f"%{name}%"

    if type:
        # Partial match on ModType
        conditions.append("ModType LIKE :type")
        params["type"] = f"%{type}%"

    if polarity:
        # Partial match on Polarity
        conditions.append("Polarity LIKE :polarity")
        params["polarity"] = f"%{polarity}%"

    if min_rank is not None:
        conditions.append("MaxRank >= :min_rank")
        params["min_rank"] = min_rank

    if max_rank is not None:
        conditions.append("MaxRank <= :max_rank")
        params["max_rank"] = max_rank

    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)

    # ---------- Sorting ----------
    allowed_sort_fields = {
        "name": "Name",
        "type": "ModType",
        "polarity": "Polarity",
        "maxrank": "MaxRank",
        "id": "ModId",
    }

    order_clause = " ORDER BY Name"  # default sort

    if sort:
        direction = "ASC"
        field_key = sort

        if sort.startswith("-"):
            direction = "DESC"
            field_key = sort[1:]

        column = allowed_sort_fields.get(field_key.lower())
        if column:
            order_clause = f" ORDER BY {column} {direction}"

    base_query += order_clause

    # ---------- Pagination ----------
    base_query += " OFFSET :skip ROWS FETCH NEXT :limit ROWS ONLY"

    try:
        print("FINAL Mods SQL:", base_query)
        print("PARAMS:", params)
        result = db.execute(text(base_query), params).fetchall()
        return result
    except Exception as e:
        # Show real error in logs, surface 500 in API
        print("ERROR executing mods query:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------
# Get a single Mod by ID
# ----------------------------------------
@router.get("/{mod_id}", response_model=Mod)
def read_mod(mod_id: int, db: Session = Depends(get_db)):
    query = text(
        "SELECT ModId, Name, ModType, Polarity, MaxRank, UniqueName, RawJson "
        "FROM [wf_base].[Mods] WHERE ModId = :id"
    )
    result = db.execute(query, {"id": mod_id}).fetchone()

    if result is None:
        raise HTTPException(status_code=404, detail="Mod not found")

    return result
