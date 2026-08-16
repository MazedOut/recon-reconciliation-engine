"""
FastAPI routes. Thin wrapper only — ZERO reconciliation logic here.
Every endpoint calls into app.core.* and returns Pydantic models directly.
"""
import os
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

from app.core import ingest, replay, diff
from app.core.models import Event, ReconciliationRun, DecisionDiff, UserPublic
from app.api.auth import get_current_user

router = APIRouter()

# Local store for the API layer to reference diffs. 
API_RUN_STORE: dict[str, ReconciliationRun] = {}

# --- DTOs for the API layer ---
class ReconcileRequest(BaseModel):
    events: list[Event]
    injected_now: datetime

class ReplayRequest(BaseModel):
    # Matches core.replay.replay signature exactly
    extra_events: Optional[list[Event]] = None
    injected_now: datetime


@router.post("/ingest", dependencies=[Depends(get_current_user)])
async def ingest_endpoint(file: UploadFile = File(...)):
    """
    Accepts raw JSON upload, writes temporarily, and passes to the pure ingest pipeline.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
        
    try:
        events, skipped = ingest.load_events(tmp_path)
        return {"events": events, "skipped": skipped}
    finally:
        os.unlink(tmp_path)


@router.post("/reconcile", response_model=ReconciliationRun)
def reconcile_endpoint(req: ReconcileRequest, _: UserPublic = Depends(get_current_user)):
    """Runs the initial baseline reconciliation."""
    run = replay.run_pipeline(req.events, req.injected_now)
    API_RUN_STORE[run.run_id] = run
    return run


@router.post("/replay/{run_id}", response_model=ReconciliationRun)
def replay_endpoint(run_id: str, req: ReplayRequest, _: UserPublic = Depends(get_current_user)):
    """Replays an existing run, optionally injecting new evidence."""
    try:
        # replay.replay() leverages its own RUN_STORE for input data, 
        # but we also update the API layer store with the newly generated run.
        run = replay.replay(run_id, req.extra_events, req.injected_now)
        API_RUN_STORE[run.run_id] = run
        return run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/diff", response_model=list[DecisionDiff])
def diff_endpoint(baseline_run_id: str, updated_run_id: str, _: UserPublic = Depends(get_current_user)):
    """Computes the direct diff and blast radius between two known states."""
    if baseline_run_id not in API_RUN_STORE:
        raise HTTPException(status_code=404, detail=f"Baseline run '{baseline_run_id}' not found.")
    if updated_run_id not in API_RUN_STORE:
        raise HTTPException(status_code=404, detail=f"Updated run '{updated_run_id}' not found.")
        
    baseline = API_RUN_STORE[baseline_run_id]
    updated = API_RUN_STORE[updated_run_id]
    
    return diff.diff_runs(baseline, updated)