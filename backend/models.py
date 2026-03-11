from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    passcode = Column(String, nullable=True) # Optional password
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    calculations = relationship("Calculation", back_populates="team")


class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    
    total_put_in = Column(Float, default=0.0)
    total_got_back = Column(Float, default=0.0)
    profit_loss = Column(Float, default=0.0)
    debt_cleared = Column(Float, default=0.0)
    
    team = relationship("Team", back_populates="calculations")
    players = relationship("CalculationPlayer", back_populates="calculation", cascade="all, delete-orphan")


class CalculationPlayer(Base):
    __tablename__ = "calculation_players"

    id = Column(Integer, primary_key=True, index=True)
    calculation_id = Column(Integer, ForeignKey("calculations.id"))
    name = Column(String)
    
    put_in = Column(Float, default=0.0)
    cuts_assigned = Column(Integer, default=0)
    payout = Column(Float, default=0.0)

    calculation = relationship("Calculation", back_populates="players")
