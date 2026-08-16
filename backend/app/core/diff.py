"""
Decision diffing across two ReconciliationRuns (e.g. baseline vs. a replay
with one injected/modified event). This is the standout feature: given
new evidence, show exactly what changed and why, plus "blast radius" —
other entities whose decisions were indirectly affected (e.g. because
corroboration counts shifted, changing a neighboring score).

1. Index both runs' decisions by entity.as_str().
2. For each entity present in either run: compare `value` dicts.
   - changed=True if value differs OR winning_event_id differs even when
     value happens to match (rule/source changed, worth surfacing).
   - reason: short human string, e.g. "new snort evidence raised
     confidence above nmap's prior decision (0.91 vs 0.78)".
3. Blast radius: entities NOT directly touched by the new event but whose
   corroboration_count changed as a side effect (requires comparing
   ScoreBreakdown.corroboration_count across runs for every entity, not
   just the directly modified one).
"""
from __future__ import annotations
from typing import Optional

from .models import ReconciliationRun, DecisionDiff, Decision, EntityKey


def _generate_reason(base_dec: Optional[Decision], up_dec: Optional[Decision], changed: bool) -> str:
    """Deterministically generate a human-readable reason for the diff."""
    if not base_dec and up_dec:
        return f"New entity resolved with confidence {up_dec.score_breakdown.final_score:.2f}."
    
    if base_dec and not up_dec:
        return "Entity no longer present in updated incident state."
        
    if not changed:
        return "No direct change to reconciled value or winning evidence."

    # Both exist, and something changed
    u_conf = up_dec.score_breakdown.final_score
    b_conf = base_dec.score_breakdown.final_score
    
    if base_dec.value != up_dec.value:
        return f"Evidence overridden prior decision (confidence {u_conf:.2f} vs {b_conf:.2f})."
    
    # Value is the same, but the winner shifted (e.g., a higher confidence event arrived late)
    return f"Winning evidence shifted, value unchanged (confidence {u_conf:.2f} vs {b_conf:.2f})."


def diff_runs(baseline: ReconciliationRun, updated: ReconciliationRun) -> list[DecisionDiff]:
    """
    Pure function that computes a unified diff between two full reconciliation runs,
    identifying direct changes and indirect 'blast radius' corroboration shifts.
    """
    base_idx = {d.entity.as_str(): d for d in baseline.decisions}
    up_idx = {d.entity.as_str(): d for d in updated.decisions}

    all_keys = set(base_idx.keys()).union(set(up_idx.keys()))
    
    # 1. First Pass: Compute Blast Radius
    # Identify entities that were indirectly affected (value/winner remained exactly the same, 
    # but corroboration counts shifted in the background).
    blast_radius_keys: list[EntityKey] = []
    
    for k in all_keys:
        if k in base_idx and k in up_idx:
            b_dec = base_idx[k]
            u_dec = up_idx[k]
            
            value_matches = (b_dec.value == u_dec.value)
            winner_matches = (b_dec.winning_event_id == u_dec.winning_event_id)
            corroboration_shifted = (
                b_dec.score_breakdown.corroboration_count != u_dec.score_breakdown.corroboration_count
            )
            
            if value_matches and winner_matches and corroboration_shifted:
                blast_radius_keys.append(u_dec.entity)

    # 2. Second Pass: Build Diff Objects
    diffs: list[DecisionDiff] = []
    
    # Sort keys for deterministic output order
    for k in sorted(all_keys):
        b_dec = base_idx.get(k)
        u_dec = up_idx.get(k)
        
        # Determine current state
        current_entity = (u_dec.entity if u_dec else b_dec.entity)
        prev_val = b_dec.value if b_dec else None
        new_val = u_dec.value if u_dec else {}
        
        # Evaluate direct change condition
        changed = False
        if not b_dec or not u_dec:
            changed = True
        else:
            changed = (b_dec.value != u_dec.value) or (b_dec.winning_event_id != u_dec.winning_event_id)

        # Generate deterministic reason
        reason = _generate_reason(b_dec, u_dec, changed)
        
        # Only attach the blast radius to entities that actively flipped
        applied_blast_radius = blast_radius_keys if changed else []

        diffs.append(
            DecisionDiff(
                entity=current_entity,
                previous_value=prev_val,
                new_value=new_val,
                changed=changed,
                reason=reason,
                blast_radius=applied_blast_radius
            )
        )

    return diffs