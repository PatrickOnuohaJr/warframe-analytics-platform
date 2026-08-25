from typing import Optional, List
from datetime import datetime
from .base import BaseSchema

class MyFrame(BaseSchema):
    FrameBuildId: int
    WarframeId: int
    BuildName: Optional[str] = None
    FormaCount: Optional[int] = 0
    Notes: Optional[str] = None
    CreatedAt: Optional[datetime] = None

class Loadout(BaseSchema):
    LoadoutId: int
    Name: str
    FrameBuildId: Optional[int] = None
    PrimaryBuildId: Optional[int] = None
    SecondaryBuildId: Optional[int] = None
    MeleeBuildId: Optional[int] = None
    CompanionBuildId: Optional[int] = None
    ParazonBuildId: Optional[int] = None
    FocusSchool: Optional[str] = None
    Notes: Optional[str] = None
    CreatedAt: Optional[datetime] = None
