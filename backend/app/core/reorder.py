"""
Reorder: chronologically sort events and identify late arrivals.

Responsibilities:
1. Sort events by timestamp ascending (oldest first).
2. Tie-break identical timestamps deterministically using SOURCE_RELIABILITY, 
   then fallback to the deterministic event id.
3. Flag events as `is_late = True` if they arrived > 1 hour before the 
   `injected_now` context.
4. Pure function: do not mutate the input list or input Event objects.
"""
from __future__ import annotations
from datetime import datetime, timedelta

from .models import Event, SOURCE_RELIABILITY


def _event_sort_key(event: Event) -> tuple:
    """
    Produces a sorting tuple ensuring strict determinism:
    1. Chronological order (timestamp)
    2. Highest reliability wins tie-breaks (negated float for descending order)
    3. Final tie-break on the deterministic hash (event.id)
    """
    reliability = SOURCE_RELIABILITY.get(event.source, 0.0)
    return (event.timestamp, -reliability, event.id)


def reorder_events(events: list[Event], injected_now: datetime) -> list[Event]:
    """
    Pure function. Returns a new list of chronologically sorted events.
    Evaluates 'is_late' strictly against the injected_now time boundary.
    """
    # Define the exact boundary for what constitutes "late" data (1 hour)
    late_boundary = injected_now - timedelta(hours=1)
    
    reordered_events: list[Event] = []
    
    # Sort pure list without mutating original
    sorted_inputs = sorted(events, key=_event_sort_key)
    
    for event in sorted_inputs:
        # Evaluate lateness
        is_late = event.timestamp < late_boundary
        
        # If the late status differs from the default/current state, 
        # create a clean copy with the updated flag to preserve purity.
        if event.is_late != is_late:
            updated_event = event.model_copy(update={"is_late": is_late})
            reordered_events.append(updated_event)
        else:
            # If no mutation is needed, we can reference the immutable-treated object
            reordered_events.append(event)
            
    return reordered_events