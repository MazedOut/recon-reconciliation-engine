"""
Core data contracts for the reconciliation engine.
Every other module (ingest, reorder, conflict, audit, narrative, replay)
and the frontend API client depend on these shapes. Do not fork/duplicate
these — extend here.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class Source(str, Enum):
    SNORT = "snort"
    NMAP = "nmap"
    BURP = "burp"
    POWERSHELL = "powershell"
    CROWDSTRIKE = "crowdstrike"
    SPLUNK = "splunk"
    SENTINEL = "sentinel"


# Fixed, deterministic weighting — NOT learned. This is the single source of
# truth for both reorder tie-breaking and confidence scoring.
SOURCE_RELIABILITY: dict[Source, float] = {
    Source.SNORT: 0.90,
    Source.NMAP: 0.75,
    Source.BURP: 0.80,
    Source.POWERSHELL: 0.60,
    Source.CROWDSTRIKE: 0.85,
    Source.SPLUNK: 0.70,
    Source.SENTINEL: 0.95,
}

# Legacy flat priority (kept for simple tie-breaks / display order)
SOURCE_PRIORITY: dict[Source, int] = {
    Source.SENTINEL: 7,
    Source.CROWDSTRIKE: 6,
    Source.SNORT: 5,
    Source.NMAP: 4,
    Source.BURP: 3,
    Source.SPLUNK: 2,
    Source.POWERSHELL: 1,
}


class EntityType(str, Enum):
    PORT = "port"
    URL = "url"
    HOST = "host"
    CONNECTION = "connection"
    SYSTEM = "system"


class EntityKey(BaseModel):
    """Everything reconciles against one of these keys."""
    type: EntityType
    identifier: str  # e.g. "10.0.0.5:445" or "https://example.com/login"

    def __hash__(self):
        return hash((self.type, self.identifier))

    def __eq__(self, other):
        return self.type == other.type and self.identifier == other.identifier

    def as_str(self) -> str:
        return f"{self.type.value}:{self.identifier}"


class RawEvent(BaseModel):
    """Shape as received from ingest, before validation/normalization."""
    source: str
    timestamp: str
    event_type: str
    data: dict[str, Any] = Field(default_factory=dict)


class Event(BaseModel):
    """Validated, normalized event used by the pipeline core."""
    id: str  # deterministic hash of (source, data, timestamp)
    source: Source
    timestamp: datetime
    event_type: str
    entity: EntityKey
    data: dict[str, Any]
    is_late: bool = False          # set during reorder, > 1hr from injected "now"
    is_duplicate_of: Optional[str] = None  # event id, if deduped


class SkippedEvent(BaseModel):
    raw: dict[str, Any]
    reason: str


class ConflictRule(BaseModel):
    rule_id: str
    description: str


class ScoreBreakdown(BaseModel):
    """Confidence scoring transparency — this is what makes the audit
    trail explain *why*, not just *what*."""
    source_reliability: float
    recency_decay: float
    corroboration_count: int
    corroboration_bonus: float
    final_score: float


class Decision(BaseModel):
    entity: EntityKey
    value: dict[str, Any]           # the reconciled state, e.g. {"status": "open"}
    winning_event_id: str
    losing_event_ids: list[str] = Field(default_factory=list)
    rule_applied: str
    score_breakdown: ScoreBreakdown


class AuditRecord(BaseModel):
    entity: EntityKey
    inputs_considered: list[str]     # event ids
    rule_applied: str
    decision: Decision
    narrative: str                   # templated human-readable explanation
    reconciled_at: datetime          # injected time, never datetime.now()


class DecisionDiff(BaseModel):
    """Output of replay-vs-replay comparison — the 'what changed' feature."""
    entity: EntityKey
    previous_value: Optional[dict[str, Any]]
    new_value: dict[str, Any]
    changed: bool
    reason: str
    blast_radius: list[EntityKey] = Field(default_factory=list)


class EntityState(BaseModel):
    """One entity's belief state at a specific point in processing."""
    entity: EntityKey
    value: dict[str, Any]
    confidence: float             # == score_breakdown.final_score at this moment
    last_updated_by: str          # event id
    last_updated_at: datetime


class IncidentStateSnapshot(BaseModel):
    """Full point-in-time state of the WHOLE incident, not a single delta.
    This is what distinguishes the audit trail from a standard log: an
    analyst can scrub to any snapshot and see everything believed about
    every entity at that instant, not just what changed."""
    snapshot_id: str                       # hash of (at, sorted entity_states)
    at: datetime                            # injected processing time of the triggering event
    triggered_by_event_id: Optional[str]    # None only for the synthetic t=0 empty snapshot
    entity_states: list[EntityState]        # FULL state of every known entity so far


class ReconciliationRun(BaseModel):
    run_id: str
    injected_now: datetime
    events: list[Event]
    decisions: list[Decision]
    audit_trail: list[AuditRecord]
    skipped_events: list[SkippedEvent]
    late_event_ids: list[str]
    duplicate_event_ids: list[str]
    state_snapshots: list[IncidentStateSnapshot] = Field(default_factory=list)


class User(BaseModel):
    """Local-only auth — no external identity provider (PRD constraint:
    no external APIs/cloud services). In-memory or flat-file store is
    sufficient for this project's scope."""
    id: str
    email: str
    hashed_password: str   # NEVER serialize this out via API responses


class UserPublic(BaseModel):
    """Safe-to-return shape — used in all auth API responses instead of User."""
    id: str
    email: str
