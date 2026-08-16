"""
Deterministic confidence scoring. NOT machine learning — fixed formula,
fixed weights, fully reproducible. This replaces a flat priority table
with a transparent, explainable score so the audit trail can show *why*
a decision won, not just cite a static rule.

score = source_reliability * recency_decay + corroboration_bonus

- source_reliability: fixed table (models.SOURCE_RELIABILITY)
- recency_decay: exponential decay vs. injected `now`, older evidence
  scores lower (but never below a floor, so ancient-but-only evidence
  still counts)
- corroboration_bonus: additional independent sources agreeing on the
  same entity+value add a fixed bonus per corroborator (diminishing)

All inputs are deterministic given (events, injected_now) — no calls to
datetime.now(), no randomness, no learned parameters.
"""
from __future__ import annotations
import math
from datetime import datetime
from .models import Event, ScoreBreakdown, SOURCE_RELIABILITY

RECENCY_HALF_LIFE_HOURS = 6.0
RECENCY_FLOOR = 0.35
CORROBORATION_BONUS_PER_SOURCE = 0.08
CORROBORATION_MAX_BONUS = 0.24  # cap at 3 corroborators


def recency_decay(event_time: datetime, injected_now: datetime) -> float:
    age_hours = max((injected_now - event_time).total_seconds() / 3600.0, 0.0)
    decay = 0.5 ** (age_hours / RECENCY_HALF_LIFE_HOURS)
    return max(decay, RECENCY_FLOOR)


def score_event(
    event: Event,
    corroborating_count: int,
    injected_now: datetime,
) -> ScoreBreakdown:
    reliability = SOURCE_RELIABILITY[event.source]
    decay = recency_decay(event.timestamp, injected_now)
    bonus = min(
        corroborating_count * CORROBORATION_BONUS_PER_SOURCE,
        CORROBORATION_MAX_BONUS,
    )
    final = reliability * decay + bonus
    return ScoreBreakdown(
        source_reliability=reliability,
        recency_decay=round(decay, 4),
        corroboration_count=corroborating_count,
        corroboration_bonus=round(bonus, 4),
        final_score=round(final, 4),
    )
