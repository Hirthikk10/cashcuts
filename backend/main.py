from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

import models, schemas
from database import engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CashCuts API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to Netlify URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the CashCuts API"}

# --- TEAM Endpoints ---

@app.post("/api/teams", response_model=schemas.Team)
def create_team(team: schemas.TeamCreate, db: Session = Depends(get_db)):
    db_team = db.query(models.Team).filter(models.Team.name == team.name).first()
    if db_team:
        raise HTTPException(status_code=400, detail="Team name already taken. Please choose another one.")
    
    new_team = models.Team(name=team.name, passcode=team.passcode)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return new_team

@app.post("/api/teams/login", response_model=schemas.Team)
def login_team(team: schemas.TeamLogin, db: Session = Depends(get_db)):
    db_team = db.query(models.Team).filter(models.Team.name == team.name).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found.")
    
    if db_team.passcode and db_team.passcode != team.passcode:
        raise HTTPException(status_code=401, detail="Incorrect passcode.")
        
    return db_team


# --- CALCULATION Endpoints ---

@app.post("/api/teams/{team_id}/calculations", response_model=schemas.Calculation)
def create_calculation(
    team_id: int, 
    calc: schemas.CalculationCreate, 
    db: Session = Depends(get_db)
):
    # Verify team exists
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")

    new_calc = models.Calculation(
        team_id=team_id,
        total_put_in=calc.total_put_in,
        total_got_back=calc.total_got_back,
        profit_loss=calc.profit_loss,
        debt_cleared=calc.debt_cleared
    )
    db.add(new_calc)
    db.commit()
    db.refresh(new_calc)

    # Add players
    for player in calc.players:
        new_player = models.CalculationPlayer(
            calculation_id=new_calc.id,
            name=player.name,
            put_in=player.put_in,
            cuts_assigned=player.cuts_assigned,
            payout=player.payout
        )
        db.add(new_player)
    
    db.commit()
    db.refresh(new_calc)
    return new_calc

@app.get("/api/teams/{team_id}/history", response_model=List[schemas.Calculation])
def get_team_history(team_id: int, limit: int = 10, db: Session = Depends(get_db)):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")

    calcs = db.query(models.Calculation).filter(
        models.Calculation.team_id == team_id
    ).order_by(models.Calculation.date.desc()).limit(limit).all()
    
    return calcs

@app.get("/api/teams/{team_id}/summary", response_model=schemas.TeamSummary)
def get_team_summary(team_id: int, db: Session = Depends(get_db)):
    db_team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    
    weekly_calcs = db.query(models.Calculation).filter(
        models.Calculation.team_id == team_id,
        models.Calculation.date >= seven_days_ago
    ).all()
    
    monthly_calcs = db.query(models.Calculation).filter(
        models.Calculation.team_id == team_id,
        models.Calculation.date >= thirty_days_ago
    ).all()
    
    weekly_profit = sum(c.profit_loss for c in weekly_calcs)
    monthly_profit = sum(c.profit_loss for c in monthly_calcs)
    
    return {
        "weekly_profit_loss": weekly_profit,
        "monthly_profit_loss": monthly_profit
    }
