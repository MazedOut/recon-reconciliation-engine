"""
Conflict detection + resolution, driven by scoring.py (NOT flat priority).

1. Group events by EntityKey.as_str().
2. Within each group, if events disagree on the relevant field for that
   entity type (PORT -> data["status"], URL -> data["status"]/"verdict",
   HOST -> data["status"]), it's a conflict.
3. For each candidate event, count corroborating_count = number of OTHER
   events in the group (any source) that agree with its value.
4. Score every candidate via scoring.score_event(event, corroborating_count,
   injected_now).
5. Winning decision = highest final_score. Ties broken by
   models.SOURCE_PRIORITY, then by earliest timestamp (fully deterministic).
6. Build a models.Decision with winning_event_id, losing_event_ids,
   rule_applied (a short machine-readable rule id string, e.g.
   "confidence_score_v1"), and the ScoreBreakdown of the winner.
7. If no conflict (all events in group agree, or only one event), still
   produce a Decision — audit trail covers every entity, not just
   conflicted ones.
"""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable

from .models import Event, Decision, EntityType, SOURCE_PRIORITY
from .scoring import score_event


# Table-driven value extraction for conflict detection (no if/elif chains).
# Extracts the "core" field that tools might disagree on for a given entity type.
VALUE_EXTRACTORS: dict[EntityType, Callable[[dict[str, Any]], Any]] = {
    EntityType.PORT: lambda data: data.get("status"),
    EntityType.URL: lambda data: data.get("verdict", data.get("status")),
    EntityType.HOST: lambda data: data.get("status"),
}


def resolve(events: list[Event], injected_now: datetime) -> list[Decision]:
    """
    Pure function that clusters events by entity, evaluates corroboration, 
    scores candidates, and emits a deterministic reconciliation decision.
    """
    # 1. Group events by EntityKey.as_str()
    # Using a dict to hold a tuple of (EntityKey, list[Event]) so we retain the object.
    groups: dict[str, tuple[Any, list[Event]]] = {}
    
    # Filter out deduplicated events from conflict resolution per ingest.py spec.
    unique_events = [e for e in events if not e.is_duplicate_of]

    for event in unique_events:
        key_str = event.entity.as_str()
        if key_str not in groups:
            groups[key_str] = (event.entity, [])
        groups[key_str][1].append(event)

    decisions: list[Decision] = []

    # 2. Process each group
    for entity_str, (entity_key, group_events) in groups.items():
        # Get the appropriate extractor for the entity type (fallback to full dict if unknown)
        extractor = VALUE_EXTRACTORS.get(entity_key.type, lambda d: str(d))
        
        # Pre-compute the comparison value for every event in this group
        event_values = {e.id: extractor(e.data) for e in group_events}
        
        candidates_scored = []
        
        for candidate in group_events:
            candidate_val = event_values[candidate.id]
            
            # 3. Count corroborating events (others in the group that agree)
            corroborating_count = sum(
                1 for other in group_events 
                if other.id != candidate.id and event_values[other.id] == candidate_val
            )
            
            # 4. Score the candidate
            score_breakdown = score_event(candidate, corroborating_count, injected_now)
            candidates_scored.append((candidate, score_breakdown))
            
        # 5. Determine the winner (Deterministic sort)
        # Sort key: (-score, -priority, timestamp, id)
        # We negate score and priority to sort them descending, timestamp/id ascending
        candidates_scored.sort(
            key=lambda item: (
                -item[1].final_score,
                -SOURCE_PRIORITY.get(item[0].source, 0),
                item[0].timestamp,
                item[0].id
            )
        )
        
        winning_event, winning_score = candidates_scored[0]
        losing_event_ids = [e.id for e, _ in candidates_scored if e.id != winning_event.id]
        
        # 6 & 7. Build Decision (always produced, even if no conflict)
        decision = Decision(
            entity=entity_key,
            value=winning_event.data,
            winning_event_id=winning_event.id,
            losing_event_ids=losing_event_ids,
            rule_applied="confidence_score_v1",
            score_breakdown=winning_score
        )
        
        decisions.append(decision)

    # Return decisions sorted deterministically by entity string to ensure stable output order
    return sorted(decisions, key=lambda d: d.entity.as_str())