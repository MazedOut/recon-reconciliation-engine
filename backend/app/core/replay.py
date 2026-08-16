"""
Replay: NOT a separate code path. Both /reconcile and /replay call the
single `run_pipeline()` function below.

CONTRACT CHANGE (v2): the pipeline now folds events ONE AT A TIME in
reordered sequence, rather than resolving the whole batch at once. This
is required by the incident-state-snapshot feature: a snapshot represents
"what did we believe at time T," which only makes sense if decisions are
recomputed incrementally as each event lands, using only the events seen
so far.
"""
from __future__ import annotations

import json
import hashlib
import copy
from datetime import datetime
from typing import Optional

from .models import (
    Event, 
    ReconciliationRun, 
    IncidentStateSnapshot, 
    EntityState,
    Decision
)
from . import reorder
from . import conflict
from . import audit

# module-level store: run_id -> (original events used, resulting run)
# Sufficient for local-only project scope; a real deployment would swap
# this for persistent storage.
RUN_STORE: dict[str, tuple[list[Event], ReconciliationRun]] = {}


def _compute_snapshot_id(at: datetime, states: list[EntityState]) -> str:
    """Deterministically hash the incident state at a given timestamp."""
    # Sort states by entity.as_str() to ensure deterministic list ordering
    sorted_states = sorted(states, key=lambda s: s.entity.as_str())
    
    # model_dump with mode='json' natively resolves Datetimes and Enums into primitives
    states_json_obj = [s.model_dump(mode='json') for s in sorted_states]
    
    canonical_states = json.dumps(states_json_obj, sort_keys=True, separators=(",", ":"))
    # Normalize ISO string to match frontend/ingest standard
    iso_time = at.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    
    payload = f"{iso_time}|{canonical_states}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _states_changed(old_states: list[EntityState], new_states: list[EntityState]) -> bool:
    """Determine if a meaningful change occurred requiring a new snapshot frame."""
    if len(old_states) != len(new_states):
        return True
        
    old_dict = {s.entity.as_str(): s for s in old_states}
    
    for new_s in new_states:
        old_s = old_dict.get(new_s.entity.as_str())
        if not old_s:
            return True
            
        # A change in value, confidence, or the winning source triggers a frame
        if old_s.value != new_s.value: 
            return True
        if old_s.confidence != new_s.confidence: 
            return True
        if old_s.last_updated_by != new_s.last_updated_by: 
            return True
            
    return False


def run_pipeline(events: list[Event], injected_now: datetime) -> ReconciliationRun:
    """
    Pure orchestration pipeline. Folds events incrementally to generate
    accurate point-in-time incident state snapshots.
    """
    # 1. Full ordering, once
    ordered_events = reorder.reorder_events(events, injected_now)
    
    # Track metadata
    late_ids = [e.id for e in ordered_events if e.is_late]
    dup_ids = [e.id for e in ordered_events if e.is_duplicate_of]
    events_by_id = {e.id: e for e in ordered_events}
    
    # 2. Emit initial IncidentStateSnapshot
    t0 = ordered_events[0].timestamp if ordered_events else injected_now
    snap0_id = _compute_snapshot_id(t0, [])
    
    snapshots: list[IncidentStateSnapshot] = [
        IncidentStateSnapshot(
            snapshot_id=snap0_id,
            at=t0,
            triggered_by_event_id=None,
            entity_states=[]
        )
    ]
    
    # 3 & 4. State tracking
    running_state: dict[str, EntityState] = {}
    seen_events: list[Event] = []
    
    prev_states: list[EntityState] = []
    final_decisions: list[Decision] = []
    
    # 5. Fold events sequentially
    for event in ordered_events:
        seen_events.append(event)
        
        # Skip re-resolving if it's a deduplicated event (provides no new evidence)
        if event.is_duplicate_of:
            continue
            
        # Re-resolve touched entities using naive/correct full-recalculation
        final_decisions = conflict.resolve(seen_events, injected_now)
        
        # Update running state
        for decision in final_decisions:
            running_state[decision.entity.as_str()] = EntityState(
                entity=decision.entity,
                value=decision.value,
                confidence=decision.score_breakdown.final_score,
                last_updated_by=decision.winning_event_id,
                last_updated_at=event.timestamp
            )
            
        current_states = list(running_state.values())
        
        # Check for state mutation
        if _states_changed(prev_states, current_states):
            snap_id = _compute_snapshot_id(event.timestamp, current_states)
            snapshots.append(IncidentStateSnapshot(
                snapshot_id=snap_id,
                at=event.timestamp,
                triggered_by_event_id=event.id,
                entity_states=copy.deepcopy(current_states)
            ))
            prev_states = copy.deepcopy(current_states)

    # 6. Build final audit trail
    audit_trail = audit.build_audit_trail(final_decisions, events_by_id, injected_now)
    
    # Compute deterministic Run ID based on injected_now and the exact event sequence
    run_hash_payload = f"{injected_now.isoformat()}|{','.join([e.id for e in ordered_events])}"
    run_id = hashlib.sha256(run_hash_payload.encode("utf-8")).hexdigest()
    
    # 7. Construct and store output
    run = ReconciliationRun(
        run_id=run_id,
        injected_now=injected_now,
        events=ordered_events,
        decisions=final_decisions,
        audit_trail=audit_trail,
        skipped_events=[],  # Skipped tracking is handled upstream by ingest.py
        late_event_ids=late_ids,
        duplicate_event_ids=dup_ids,
        state_snapshots=snapshots
    )
    
    RUN_STORE[run_id] = (ordered_events, run)
    return run


def replay(
    run_id: str,
    extra_events: Optional[list[Event]],
    injected_now: datetime,
) -> ReconciliationRun:
    """
    Retrieves a baseline run's input data, appends any new evidence, 
    and completely re-runs the pipeline deterministicly.
    """
    if run_id not in RUN_STORE:
        raise ValueError(f"Run ID '{run_id}' not found in RUN_STORE.")
        
    original_events, _ = RUN_STORE[run_id]
    
    combined_events = list(original_events)
    if extra_events:
        combined_events.extend(extra_events)
        
    return run_pipeline(combined_events, injected_now)