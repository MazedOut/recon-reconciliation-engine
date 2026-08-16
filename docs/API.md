# API Contract Documentation

The SOC Reconciliation Engine exposes a high-performance RESTful API powered by **FastAPI** and **Pydantic v2**. 

All endpoints return JSON responses and support CORS across local and containerized development environments.

---

## 🔐 Authentication

Endpoints require standard HTTP Bearer token authentication:
```http
Authorization: Bearer <access_token>
```
Tokens are issued via `POST /auth/login`.

---

## 📡 Endpoints Overview

| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/login` | Authenticate operator and issue JWT/bearer session token. | No |
| `GET` | `/auth/me` | Retrieve authenticated operator profile. | Yes |
| `POST` | `/ingest` | Ingest raw telemetry files or JSON strings and normalize into valid events. | Optional |
| `POST` | `/reconcile` | Execute full deterministic reconciliation pipeline over a batch of events. | Optional |
| `POST` | `/replay/{run_id}` | Inject new evidence into a prior baseline run and re-resolve incident state. | Optional |
| `GET` | `/diff` | Compare decisions between two runs to calculate state flips and blast radius. | Optional |
| `GET` | `/health` | Liveness and health check endpoint. | No |

---

## 1. `POST /auth/login`
Authenticate a user or SOC operator.

### Request
```http
POST /auth/login
Content-Type: application/json
```
```json
{
  "email": "demo@recon.local",
  "password": "admin123"
}
```

### Response (`200 OK`)
```json
{
  "token": "d7a8f9c1b3e5...",
  "user": {
    "id": "usr_demo01",
    "email": "demo@recon.local"
  }
}
```

---

## 2. `POST /ingest`
Upload raw security logs (JSON array or file upload) for normalization and ingestion into the reconciliation pipeline.

### Request
```http
POST /ingest
Content-Type: application/json
```
```json
{
  "raw_payload": [
    {
      "source": "snort",
      "timestamp": "2026-08-16T12:00:00Z",
      "event_type": "ids_alert",
      "entity": {
        "type": "host",
        "identifier": "10.0.0.5"
      },
      "data": {
        "status": "compromised",
        "alert": "EternalBlue Exploit Attempt"
      }
    }
  ]
}
```

### Response (`200 OK`)
```json
{
  "status": "success",
  "ingested_count": 1,
  "events": [
    {
      "id": "evt-snort-1",
      "source": "snort",
      "timestamp": "2026-08-16T12:00:00Z",
      "event_type": "ids_alert",
      "entity": {
        "type": "host",
        "identifier": "10.0.0.5"
      },
      "data": {
        "status": "compromised",
        "alert": "EternalBlue Exploit Attempt"
      },
      "is_late": false,
      "is_duplicate_of": null
    }
  ]
}
```

---

## 3. `POST /reconcile`
Executes full temporal sorting, deduplication, conflict resolution, narrative synthesis, and snapshot folding.

### Request
```http
POST /reconcile
Content-Type: application/json
```
```json
{
  "events": [
    {
      "id": "evt-nmap-1",
      "source": "nmap",
      "timestamp": "2026-08-16T10:00:00Z",
      "event_type": "port_scan",
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "data": { "status": "closed" }
    },
    {
      "id": "evt-snort-1",
      "source": "snort",
      "timestamp": "2026-08-16T10:00:05Z",
      "event_type": "exploit_alert",
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "data": { "status": "open", "threat": "critical" }
    }
  ],
  "injected_now": "2026-08-16T10:30:00Z"
}
```

### Response (`200 OK`)
```json
{
  "run_id": "a1b2c3d4e5f6...",
  "injected_now": "2026-08-16T10:30:00Z",
  "events": [ /* Full list of chronologically sorted events */ ],
  "decisions": [
    {
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "value": { "status": "open", "threat": "critical" },
      "winning_event_id": "evt-snort-1",
      "losing_event_ids": ["evt-nmap-1"],
      "rule_applied": "higher_confidence_override",
      "score_breakdown": {
        "source_reliability": 0.90,
        "recency_decay": 0.98,
        "corroboration_count": 0,
        "corroboration_bonus": 0.0,
        "final_score": 0.882
      }
    }
  ],
  "audit_trail": [
    {
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "inputs_considered": ["evt-snort-1", "evt-nmap-1"],
      "rule_applied": "higher_confidence_override",
      "decision": { /* Decision Object */ },
      "narrative": "Resolved conflict on port 10.0.0.5:445: snort (score 0.882) overruled nmap (score 0.735) due to higher source fidelity and temporal recency.",
      "reconciled_at": "2026-08-16T10:30:00Z"
    }
  ],
  "skipped_events": [],
  "late_event_ids": [],
  "duplicate_event_ids": [],
  "state_snapshots": [
    {
      "snapshot_id": "snap-987abc...",
      "at": "2026-08-16T10:00:05Z",
      "triggered_by_event_id": "evt-snort-1",
      "entity_states": [
        {
          "entity": { "type": "port", "identifier": "10.0.0.5:445" },
          "value": { "status": "open", "threat": "critical" },
          "confidence": 0.882,
          "last_updated_by": "evt-snort-1",
          "last_updated_at": "2026-08-16T10:00:05Z"
        }
      ]
    }
  ]
}
```

---

## 4. `POST /replay/{run_id}`
Re-executes the reconciliation pipeline against a stored baseline run with optional new evidence.

### Request
```http
POST /replay/a1b2c3d4e5f6...
Content-Type: application/json
```
```json
{
  "extra_events": [
    {
      "id": "evt-crowdstrike-late",
      "source": "crowdstrike",
      "timestamp": "2026-08-16T10:00:10Z",
      "event_type": "edr_quarantine",
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "data": { "status": "closed", "action": "blocked" },
      "is_late": true
    }
  ],
  "injected_now": "2026-08-16T10:35:00Z"
}
```

### Response (`200 OK`)
Returns an updated `ReconciliationRun` object with recalculation of all entity states and generated snapshots.

---

## 5. `GET /diff`
Calculates the exact delta ($\Delta$) between two runs to identify flipped verdicts and affected blast radius entities.

### Query Parameters
* `baseline_run_id` (string, required): The ID of the initial baseline run.
* `updated_run_id` (string, required): The ID of the replayed run.

### Request
```http
GET /diff?baseline_run_id=a1b2c3d4e5f6...&updated_run_id=f9e8d7c6b5a4...
```

### Response (`200 OK`)
```json
[
  {
    "entity": { "type": "port", "identifier": "10.0.0.5:445" },
    "change_type": "modified",
    "baseline_decision": {
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "value": { "status": "open" },
      "winning_event_id": "evt-snort-1",
      "rule_applied": "higher_confidence_override"
    },
    "updated_decision": {
      "entity": { "type": "port", "identifier": "10.0.0.5:445" },
      "value": { "status": "closed", "action": "blocked" },
      "winning_event_id": "evt-crowdstrike-late",
      "rule_applied": "late_arrival_override"
    },
    "reason": "Late-arriving CrowdStrike telemetry overruled prior Snort alert."
  }
]
```

---

## 📊 Error Codes & Responses

| Status Code | Reason | Example Cause |
| :---: | :--- | :--- |
| `200` | OK | Request executed successfully. |
| `400` | Bad Request | Invalid parameter or corrupted JSON payload. |
| `401` | Unauthorized | Missing or expired Bearer token on protected route. |
| `404` | Not Found | Target `run_id` does not exist in `RUN_STORE`. |
| `422` | Unprocessable Content | Pydantic validation error (e.g. invalid source or entity type). |
| `500` | Internal Server Error | Unhandled server exception. |
