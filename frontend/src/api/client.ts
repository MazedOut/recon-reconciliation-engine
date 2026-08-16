/**
 * Typed fetch wrappers matching docs/API.md exactly. Types are manually
 * mirrored from backend/app/core/models.py — keep them in sync when the
 * backend schema changes (no codegen for this project's scope).
 *
 * All functions attach Bearer token from localStorage and handle 401
 * redirects automatically.
 */

const BASE_URL = "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────

export interface EntityKey {
  type: "port" | "url" | "host";
  identifier: string;
}

export interface ScoreBreakdown {
  source_reliability: number;
  recency_decay: number;
  corroboration_count: number;
  corroboration_bonus: number;
  final_score: number;
}

export interface Decision {
  entity: EntityKey;
  value: Record<string, unknown>;
  winning_event_id: string;
  losing_event_ids: string[];
  rule_applied: string;
  score_breakdown: ScoreBreakdown;
}

export interface AuditRecord {
  entity: EntityKey;
  inputs_considered: string[];
  rule_applied: string;
  decision: Decision;
  narrative: string;
  reconciled_at: string;
}

export interface Event {
  id: string;
  source: string;
  timestamp: string;
  event_type: string;
  entity: EntityKey;
  data: Record<string, unknown>;
  is_late: boolean;
  is_duplicate_of: string | null;
}

export interface EntityState {
  entity: EntityKey;
  value: Record<string, unknown>;
  confidence: number;
  last_updated_by: string;
  last_updated_at: string;
}

export interface IncidentStateSnapshot {
  snapshot_id: string;
  at: string;
  triggered_by_event_id: string | null;
  entity_states: EntityState[];
}

export interface ReconciliationRun {
  run_id: string;
  injected_now: string;
  decisions: Decision[];
  audit_trail: AuditRecord[];
  skipped_events: { raw: Record<string, unknown>; reason: string }[];
  late_event_ids: string[];
  duplicate_event_ids: string[];
  events?: Event[];
  state_snapshots: IncidentStateSnapshot[];
}

export interface DecisionDiff {
  entity: EntityKey;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown>;
  changed: boolean;
  reason: string;
  blast_radius: EntityKey[];
}

// ─── Auth-aware fetch helper ──────────────────────────────────────────

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("recon_auth_token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("recon_auth_token");
    window.location.href = "/login";
    throw new Error("Session expired. Redirecting to login.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "Unknown error");
    throw new Error(`API Error ${response.status}: ${detail}`);
  }

  return response;
}

// ─── API Functions ────────────────────────────────────────────────────

export async function ingest(file: File): Promise<{ events: Event[]; skipped: { raw: Record<string, unknown>; reason: string }[] }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch(`${BASE_URL}/ingest`, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

export async function reconcile(
  events: unknown[],
  injectedNow: string
): Promise<ReconciliationRun> {
  const response = await authFetch(`${BASE_URL}/reconcile`, {
    method: "POST",
    body: JSON.stringify({ events, injected_now: injectedNow }),
  });

  return response.json();
}

export async function replay(
  runId: string,
  extraEvents: unknown[] | null,
  injectedNow: string
): Promise<ReconciliationRun> {
  const response = await authFetch(`${BASE_URL}/replay/${runId}`, {
    method: "POST",
    body: JSON.stringify({
      extra_events: extraEvents,
      injected_now: injectedNow,
    }),
  });

  return response.json();
}

export async function diff(
  baselineRunId: string,
  updatedRunId: string
): Promise<DecisionDiff[]> {
  const params = new URLSearchParams({
    baseline_run_id: baselineRunId,
    updated_run_id: updatedRunId,
  });

  const response = await authFetch(`${BASE_URL}/diff?${params.toString()}`, {
    method: "GET",
  });

  return response.json();
}
