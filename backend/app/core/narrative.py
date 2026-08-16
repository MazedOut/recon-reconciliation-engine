"""
Templated, deterministic narrative generation for audit records.
IMPORTANT: PRD constraint forbids ML/LLM models. This module must remain
pure string templating driven by the Decision/ScoreBreakdown fields —
no external API calls, no generative model of any kind.

Goal: turn a Decision into a sentence an analyst would write, e.g.

  "Port 445 on 10.0.0.5 was marked OPEN based on snort (confidence 0.82,
   corroborated by 2 other source(s)) at 2026-01-14T14:03:00Z, overriding
   nmap's CLOSED reading from 40 minutes prior."

Approach:
- A small set of templates keyed by EntityType (+ whether it was a real
  conflict vs. unanimous agreement vs. single-source).
- Fill fields directly from Decision + ScoreBreakdown + the losing event(s)
  for the "overriding X's Y reading" clause when losing_event_ids is
  non-empty.
- Compute the time delta between winner and top losing event's timestamps
  for the "N minutes prior" phrasing.
"""
from __future__ import annotations
from .models import Decision, Event, EntityType

def _get_display_value(entity_type: EntityType, value_dict: dict) -> str:
    """Helper to extract a human-readable primary value from the data dict."""
    if entity_type == EntityType.PORT:
        return str(value_dict.get("status", "UNKNOWN")).upper()
    elif entity_type == EntityType.URL:
        return str(value_dict.get("verdict", value_dict.get("status", "UNKNOWN"))).upper()
    elif entity_type == EntityType.HOST:
        return str(value_dict.get("status", "UNKNOWN")).upper()
    return "UNKNOWN"

def narrate(decision: Decision, events_by_id: dict[str, Event]) -> str:
    """
    Pure function generating a deterministic human-readable audit narrative.
    """
    # 1. Format the Entity Display String
    if decision.entity.type == EntityType.PORT and ":" in decision.entity.identifier:
        host, port = decision.entity.identifier.split(":", 1)
        entity_display = f"Port {port} on {host}"
    else:
        entity_display = f"{decision.entity.type.value.capitalize()} {decision.entity.identifier}"

    # 2. Extract Winning Information
    winner = events_by_id[decision.winning_event_id]
    winner_val = _get_display_value(decision.entity.type, decision.value)
    score = decision.score_breakdown.final_score
    corr_count = decision.score_breakdown.corroboration_count
    
    # ISO string without microseconds for cleaner readability
    winner_time = winner.timestamp.replace(microsecond=0).isoformat().replace("+00:00", "Z")

    # 3. Base Narrative construction
    base_narrative = (
        f"{entity_display} was marked {winner_val} based on {winner.source.value} "
        f"(confidence {score:.2f}, corroborated by {corr_count} other source(s)) "
        f"at {winner_time}"
    )

    # 4. Handle Unanimous/Single-Source (No Conflict)
    if not decision.losing_event_ids:
        return base_narrative + "."

    # 5. Handle Conflict (Overriding Clause)
    top_loser_id = decision.losing_event_ids[0]
    top_loser = events_by_id[top_loser_id]
    loser_val = _get_display_value(decision.entity.type, top_loser.data)

    delta_seconds = (winner.timestamp - top_loser.timestamp).total_seconds()
    delta_minutes = abs(int(delta_seconds / 60))
    timing_phrase = "prior" if delta_seconds >= 0 else "later"

    conflict_clause = (
        f", overriding {top_loser.source.value}'s {loser_val} reading "
        f"from {delta_minutes} minutes {timing_phrase}."
    )

    return base_narrative + conflict_clause