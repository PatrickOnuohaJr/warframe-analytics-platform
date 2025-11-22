from typing import Optional
from .base import BaseSchema

class Mod(BaseSchema):
    ModId: int
    UniqueName: Optional[str] = None
    Name: Optional[str] = None
    ModType: Optional[str] = None
    Polarity: Optional[str] = None
    MaxRank: Optional[int] = None
