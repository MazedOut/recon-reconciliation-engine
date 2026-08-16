"""
Ingest: raw JSON -> validated Event objects.

Responsibilities (implement in order):
1. Parse raw JSON list (file or stdin) into RawEvent.
2. Validate required fields (source, timestamp, event_type, data).
   On failure: append to SkippedEvent list with a specific reason string
   (e.g. "missing timestamp", "invalid source", "unparseable timestamp").
   NEVER raise — always degrade to skip + log.
3. Derive EntityKey from event_type + data (see ENTITY_EXTRACTORS below —
   this is source/event_type-specific mapping logic, keep it table-driven).
4. Compute deterministic event id = sha256(source + '|' + timestamp_iso +
   '|' + canonical_json(data)) — this is what dedup and replay hash on.
5. Dedup: if id already seen in this run, mark is_duplicate_of and exclude
   from downstream conflict resolution (but keep in output for auditability).
"""
from __future__ import annotations

import json
import hashlib
from datetime import datetime
from typing import Callable, Any

from pydantic import ValidationError
from .models import Event, SkippedEvent, RawEvent, EntityKey, EntityType, Source


def _extract_port_nmap(data: dict[str, Any]) -> EntityKey:
    return EntityKey(type=EntityType.PORT, identifier=f"{data['ip']}:{data['port']}")


def _extract_port_snort(data: dict[str, Any]) -> EntityKey:
    return EntityKey(type=EntityType.PORT, identifier=f"{data['dst_ip']}:{data['dst_port']}")


def _extract_url_burp(data: dict[str, Any]) -> EntityKey:
    return EntityKey(type=EntityType.URL, identifier=data["url"])


def _extract_url_powershell(data: dict[str, Any]) -> EntityKey:
    return EntityKey(type=EntityType.URL, identifier=data["url"])


def _extract_host_powershell(data: dict[str, Any]) -> EntityKey:
    return EntityKey(type=EntityType.HOST, identifier=data["host"])


# Table-driven extraction logic — zero if/elif chains
ENTITY_EXTRACTORS: dict[tuple[str, str], Callable[[dict[str, Any]], EntityKey]] = {
    ("nmap", "port_scan"): _extract_port_nmap,
    ("snort", "alert"): _extract_port_snort,
    ("snort", "port_alert"): _extract_port_snort,
    ("snort", "exploit_alert"): _extract_port_snort,
    ("snort", "ids_alert"): _extract_port_snort,
    ("burp", "vulnerability"): _extract_url_burp,
    ("burp", "url_scan"): _extract_url_burp,
    ("powershell", "web_request"): _extract_url_powershell,
    ("powershell", "execution"): _extract_host_powershell,
    ("powershell", "process_alert"): _extract_port_nmap,
    ("powershell", "process_log"): _extract_host_powershell,
    ("crowdstrike", "edr_alert"): _extract_host_powershell,
    ("crowdstrike", "network_log"): _extract_host_powershell,
    ("crowdstrike", "agent_heartbeat"): _extract_host_powershell,
}


def _extract_fallback(data: dict[str, Any]) -> EntityKey:
    if "url" in data:
        return EntityKey(type=EntityType.URL, identifier=str(data["url"]))
    if "dst_ip" in data and "dst_port" in data:
        return EntityKey(type=EntityType.PORT, identifier=f"{data['dst_ip']}:{data['dst_port']}")
    if "ip" in data and "port" in data:
        return EntityKey(type=EntityType.PORT, identifier=f"{data['ip']}:{data['port']}")
    if "host" in data:
        return EntityKey(type=EntityType.HOST, identifier=str(data["host"]))
    if "ip" in data:
        return EntityKey(type=EntityType.HOST, identifier=str(data["ip"]))
    return EntityKey(type=EntityType.SYSTEM, identifier="system")


def _parse_timestamp(ts_str: str) -> datetime:
    """Parses standard ISO 8601 strings, replacing Z with standard UTC offset."""
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def _compute_event_hash(source: str, timestamp_iso: str, data: dict[str, Any]) -> str:
    """Computes the deterministic SHA-256 hash for an event."""
    canonical_data = json.dumps(data, sort_keys=True, separators=(",", ":"))
    hash_payload = f"{source}|{timestamp_iso}|{canonical_data}"
    return hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()


def load_events(source_path: str) -> tuple[list[Event], list[SkippedEvent]]:
    """
    Pure function. Reads a JSON array of events, validates them, derives
    deterministic hashes, dedups, and emits clean Event objects or SkippedEvents.
    """
    events: list[Event] = []
    skipped: list[SkippedEvent] = []
    seen_hashes: set[str] = set()

    try:
        with open(source_path, "r", encoding="utf-8") as f:
            raw_data_list = json.load(f)
    except Exception as e:
        # If the file itself is broken/missing, wrap the failure as a skipped event
        return [], [SkippedEvent(raw={"file": source_path}, reason=f"Failed to read/parse file: {str(e)}")]

    if not isinstance(raw_data_list, list):
        return [], [SkippedEvent(raw={"data": type(raw_data_list).__name__}, reason="Root JSON must be a list")]

    for item in raw_data_list:
        if not isinstance(item, dict):
            skipped.append(SkippedEvent(raw={"item": str(item)}, reason="Event payload must be a JSON object"))
            continue

        try:
            # 1. Parse into RawEvent
            raw = RawEvent(**item)

            # 2. Validate Source Enum
            valid_source = Source(raw.source)

            # 3. Validate Timestamp
            parsed_timestamp = _parse_timestamp(raw.timestamp)

            # 4. Derive EntityKey
            extractor = ENTITY_EXTRACTORS.get((raw.source, raw.event_type)) or _extract_fallback
            entity_key = extractor(raw.data)

            # 5. Compute Deterministic Hash
            event_hash = _compute_event_hash(raw.source, parsed_timestamp.isoformat(), raw.data)

            # 6. Deduplication logic
            is_dup: str | None = None
            final_id = event_hash

            if event_hash in seen_hashes:
                is_dup = event_hash
                # For deterministic uniqueness in the DB while maintaining provenance,
                # duplicate IDs append a suffix based on total parsed events so far.
                final_id = f"{event_hash}-dup-{len(events)}"
            else:
                seen_hashes.add(event_hash)

            # 7. Construct Final Validated Event
            validated_event = Event(
                id=final_id,
                source=valid_source,
                timestamp=parsed_timestamp,
                event_type=raw.event_type,
                entity=entity_key,
                data=raw.data,
                is_late=False,  # Reorder module sets this later
                is_duplicate_of=is_dup
            )
            events.append(validated_event)

        except ValidationError as e:
            skipped.append(SkippedEvent(raw=item, reason=f"Schema validation failed: {str(e)}"))
        except ValueError as e:
            skipped.append(SkippedEvent(raw=item, reason=f"Value validation failed: {str(e)}"))
        except KeyError as e:
            skipped.append(SkippedEvent(raw=item, reason=f"Missing required data key for extraction: {str(e)}"))
        except Exception as e:
            skipped.append(SkippedEvent(raw=item, reason=f"Unexpected parsing error: {str(e)}"))

    return events, skipped