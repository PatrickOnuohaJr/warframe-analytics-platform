from typing import Optional
from .base import BaseSchema

class Weapon(BaseSchema):
    WeaponId: int
    UniqueName: Optional[str] = None
    Name: Optional[str] = None
    Type: Optional[str] = None
    MasteryRank: Optional[int] = None
    Impact: Optional[float] = None
    Puncture: Optional[float] = None
    Slash: Optional[float] = None
    CritChance: Optional[float] = None
    CritMultiplier: Optional[float] = None
    StatusChance: Optional[float] = None
    FireRate: Optional[float] = None
    MagazineSize: Optional[int] = None
    ReloadTime: Optional[float] = None
    Multishot: Optional[float] = None
