"""
Builds AuditRecord list from Decisions, and writes JSON/CSV output.

1. For each Decision, build an AuditRecord:
   - inputs_considered = [winning_event_id] + losing_event_ids
   - rule_applied = decision.rule_applied
   - narrative = narrative.narrate(decision, events_by_id)
   - reconciled_at = injected_now (parameter, never datetime.now())
2. write_json(records, path) — pretty-printed, stable key order.
3. write_csv(records, path) — flatten nested fields (entity, score
   breakdown) into columns; document the column schema in docs/API.md.
"""
from __future__ import annotations
import json
import csv
from datetime import datetime

from .models import Decision, Event, AuditRecord
from .narrative import narrate


def build_audit_trail(
    decisions: list[Decision],
    events_by_id: dict[str, Event],
    injected_now: datetime,
) -> list[AuditRecord]:
    """
    Pure orchestration function. Constructs audit records linking 
    deterministic decisions back to their origins and generated narrative.
    """
    records: list[AuditRecord] = []
    
    for decision in decisions:
        inputs = [decision.winning_event_id] + decision.losing_event_ids
        record = AuditRecord(
            entity=decision.entity,
            inputs_considered=inputs,
            rule_applied=decision.rule_applied,
            decision=decision,
            narrative=narrate(decision, events_by_id),
            reconciled_at=injected_now,
        )
        records.append(record)
        
    return records


def write_json(records: list[AuditRecord], path: str) -> None:
    """Writes pure JSON with deterministic key order."""
    # Using Pydantic's model_dump with mode='json' natively serializes dates/enums
    dumped_data = [record.model_dump(mode='json') for record in records]
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(dumped_data, f, indent=2, sort_keys=True)


def write_csv(records: list[AuditRecord], path: str) -> None:
    """Flattens nested audit and score breakdown data into a stable CSV schema."""
    if not records:
        return
        
    fieldnames = [
        "entity_type",
        "entity_identifier",
        "inputs_considered",
        "rule_applied",
        "reconciled_at",
        "winning_event_id",
        "losing_event_ids",
        "decision_value",
        "score_source_reliability",
        "score_recency_decay",
        "score_corroboration_count",
        "score_corroboration_bonus",
        "score_final_score",
        "narrative"
    ]
    
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for r in records:
            writer.writerow({
                "entity_type": r.entity.type.value,
                "entity_identifier": r.entity.identifier,
                "inputs_considered": "|".join(r.inputs_considered),
                "rule_applied": r.rule_applied,
                "reconciled_at": r.reconciled_at.isoformat(),
                "winning_event_id": r.decision.winning_event_id,
                "losing_event_ids": "|".join(r.decision.losing_event_ids),
                "decision_value": json.dumps(r.decision.value, separators=(',', ':')),
                "score_source_reliability": r.decision.score_breakdown.source_reliability,
                "score_recency_decay": r.decision.score_breakdown.recency_decay,
                "score_corroboration_count": r.decision.score_breakdown.corroboration_count,
                "score_corroboration_bonus": r.decision.score_breakdown.corroboration_bonus,
                "score_final_score": r.decision.score_breakdown.final_score,
                "narrative": r.narrative
            })