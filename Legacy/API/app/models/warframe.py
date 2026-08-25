from typing import Optional
from .base import BaseSchema

class Warframe(BaseSchema):
    WarframeId: int
    UniqueName: Optional[str] = None
    Name: Optional[str] = None
    Armor: Optional[int] = None
    Health: Optional[int] = None
    Shields: Optional[int] = None
    Energy: Optional[int] = None
    SprintSpeed: Optional[float] = None
