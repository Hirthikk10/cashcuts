from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Player Schemas
class PlayerBase(BaseModel):
    name: str
    put_in: float
    cuts_assigned: int
    payout: float

class PlayerCreate(PlayerBase):
    pass

class Player(PlayerBase):
    id: int
    calculation_id: int

    class Config:
        orm_mode = True

# Calculation Schemas
class CalculationBase(BaseModel):
    total_put_in: float
    total_got_back: float
    profit_loss: float
    debt_cleared: float

class CalculationCreate(CalculationBase):
    players: List[PlayerCreate]

class Calculation(CalculationBase):
    id: int
    team_id: int
    date: datetime
    players: List[Player]

    class Config:
        orm_mode = True

# Team Schemas
class TeamBase(BaseModel):
    name: str

class TeamCreate(TeamBase):
    passcode: Optional[str] = None

class TeamLogin(TeamBase):
    passcode: Optional[str] = None

class Team(TeamBase):
    id: int
    created_at: datetime
    calculations: List[Calculation] = []

    class Config:
        orm_mode = True

class TeamSummary(BaseModel):
    weekly_profit_loss: float
    monthly_profit_loss: float
