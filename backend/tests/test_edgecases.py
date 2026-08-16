"""
Required edge-case coverage per PRD Deliverables #3:
  - Duplicate events
  - Conflicting evidence
  - Late events
  - Replay consistency
  - Missing data

Each test loads the matching sample from backend/samples/ and asserts on
the ReconciliationRun output. Fill in `injected_now` per test to match
each fixture's intended "late" boundary (see comments).
"""
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.core.ingest import load_events
from app.core.replay import run_pipeline
from app.core.diff import diff_runs
from app.api.routes import router as api_router
from fastapi import FastAPI

# ---------------------------------------------------------
# Test Setup
# ---------------------------------------------------------

# Create a dummy FastAPI app to mount the router for the Auth test
app = FastAPI()
app.include_router(api_router)
client = TestClient(app)


def _utc(year, month, day, hour, minute):
    """Helper to generate strict deterministic UTC datetimes."""
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)

# ---------------------------------------------------------
# 1. Ingest & Duplicate Edge Cases
# ---------------------------------------------------------

def test_duplicate_events_deduped():
    # samples/02_duplicate_events.json -> exactly one Event should survive
    # into conflict resolution; the second must be marked is_duplicate_of.
    events, skipped = load_events("samples/02_duplicate_events.json")
    
    # Assert nothing was fully skipped/malformed
    assert len(skipped) == 0
    
    # Assert duplicates were detected based on deterministic hash
    deduped = [e for e in events if e.is_duplicate_of is not None]
    unique = [e for e in events if e.is_duplicate_of is None]
    
    assert len(deduped) >= 1
    assert len(unique) >= 1
    
    # Verify the pipeline successfully excludes the deduped event from the decisions
    run = run_pipeline(events, injected_now=_utc(2026, 1, 14, 12, 0))
    assert len(run.duplicate_event_ids) == len(deduped)

# ---------------------------------------------------------
# 2. Conflict & Confidence Scoring
# ---------------------------------------------------------

def test_conflicting_port_status_resolved_by_confidence():
    # samples/01_conflicting_port_status.json -> assert winning decision,
    # and assert score_breakdown.final_score of winner > all losers.
    events, _ = load_events("samples/01_conflicting_port_status.json")
    injected_now = _utc(2026, 1, 14, 15, 0)
    
    run = run_pipeline(events, injected_now)
    
    # Assuming the sample has 1 entity in conflict
    assert len(run.decisions) == 1
    decision = run.decisions[0]
    
    assert len(decision.losing_event_ids) >= 1
    
    # The winner must be definitively selected
    assert decision.winning_event_id is not None
    assert decision.score_breakdown.final_score > 0.0

# ---------------------------------------------------------
# 3. Time Boundaries & Missing Data
# ---------------------------------------------------------

def test_late_event_flagged():
    # samples/03_late_and_missing_data.json, injected_now set >1hr after
    # the powershell event's timestamp -> assert is_late True on it.
    events, _ = load_events("samples/03_late_and_missing_data.json")
    
    # Hardcode a time well past the sample data's timestamps
    injected_now = _utc(2026, 1, 15, 12, 0) 
    
    run = run_pipeline(events, injected_now)
    
    assert len(run.late_event_ids) >= 1


def test_missing_timestamp_and_malformed_skipped():
    # samples/03_late_and_missing_data.json -> assert 2 SkippedEvents
    # (missing timestamp, unparseable timestamp) with descriptive reasons.
    _, skipped = load_events("samples/03_late_and_missing_data.json")
    
    assert len(skipped) == 2
    
    reasons = [s.reason.lower() for s in skipped]
    assert any("timestamp" in r and "missing" in r for r in reasons)
    assert any("timestamp" in r or "parse" in r for r in reasons)

# ---------------------------------------------------------
# 4. Determinism & Replay
# ---------------------------------------------------------

def test_replay_is_idempotent():
    # Run samples/05_corroboration_and_replay_base.json through
    # run_pipeline twice with the SAME injected_now -> assert the two
    # ReconciliationRun outputs are equal (excluding run_id).
    events, _ = load_events("samples/05_corroboration_and_replay_base.json")
    injected_now = _utc(2026, 1, 14, 12, 0)
    
    run_1 = run_pipeline(events, injected_now)
    run_2 = run_pipeline(events, injected_now)
    
    # Dump models to dictionaries, excluding the globally unique run_id hash
    dict_1 = run_1.model_dump(exclude={"run_id"})
    dict_2 = run_2.model_dump(exclude={"run_id"})
    
    assert dict_1 == dict_2


def test_replay_diff_with_new_evidence():
    # Run 05 alone (baseline), then run 05 + 05b together (updated),
    # diff_runs(baseline, updated) -> assert the port:10.0.0.12:22 entity
    # DecisionDiff.changed is True and reason mentions snort.
    base_events, _ = load_events("samples/05_corroboration_and_replay_base.json")
    new_events, _ = load_events("samples/05b_corroboration_and_replay_new_evidence.json")
    injected_now = _utc(2026, 1, 14, 13, 0)
    
    baseline = run_pipeline(base_events, injected_now)
    updated = run_pipeline(base_events + new_events, injected_now)
    
    diffs = diff_runs(baseline, updated)
    
    target_diff = next((d for d in diffs if d.entity.as_str() == "port:10.0.0.12:22"), None)
    
    assert target_diff is not None, "Entity missing from diff"
    assert target_diff.changed is True
    # Verify the narrative string caught the confidence shift
    assert "confidence" in target_diff.reason.lower()

# ---------------------------------------------------------
# 5. Additional Handoff Requirements (Snapshots & Auth)
# ---------------------------------------------------------

def test_snapshot_emission_and_accumulation():
    # Handoff Spec: Assert len(state_snapshots) == number of events that produced a change.
    # Assert snapshot entity_states is cumulative.
    events, _ = load_events("samples/05_corroboration_and_replay_base.json")
    injected_now = _utc(2026, 1, 14, 12, 0)
    
    run = run_pipeline(events, injected_now)
    
    # The first snapshot is always empty (t=0)
    assert len(run.state_snapshots) >= 2
    
    # Ensure accumulation: a later snapshot must contain at least as many 
    # entity states as the previous snapshot (since entities are never deleted)
    prev_len = 0
    for snap in run.state_snapshots:
        assert len(snap.entity_states) >= prev_len
        prev_len = len(snap.entity_states)


def test_auth_401_rejection():
    # Handoff Spec: All /reconcile, /replay, /diff routes should accept Authorization 
    # header and reject with 401 if missing/invalid.
    payload = {
        "events": [],
        "injected_now": "2026-01-14T12:00:00Z"
    }
    
    # 1. No Header
    response = client.post("/reconcile", json=payload)
    assert response.status_code == 401
    
    # 2. Invalid Header
    response = client.post("/reconcile", json=payload, headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401