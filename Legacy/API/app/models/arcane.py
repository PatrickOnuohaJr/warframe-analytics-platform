from typing import Optional
from .base import BaseSchema

class Arcane(BaseSchema):
    ArcaneId: int
    UniqueName: Optional[str] = None
    Name: Optional[str] = None
    ItemType: Optional[str] = None
    MaxRank: Optional[int] = None
