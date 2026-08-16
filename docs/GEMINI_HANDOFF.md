# Gemini Pro — Implementation Handoff

Paste the relevant section(s) below into Gemini alongside the target file's
skeleton when asking it to implement a module. This doc is the fixed
context that keeps every file's conventions consistent — without it,
per-file generation will drift and Antigravity's optimization pass will
waste time reconciling mismatched interfaces instead of improving logic.

## Non-negotiable project rules (paste this into EVERY Gemini prompt)

1. **Never redefine schema.** All data shapes live in
   `backend/app/core/models.py`. Import and use them exactly as defined —
   do not add fields, do not create parallel dataclasses.
2. **No `datetime.now()` anywhere in `app/core/`.** "Current time" is
   always an explicit `injected_now: datetime` parameter. This is required
   for replay determinism (NFR #1 and #3 in the PRD).
3. **No ML/LLM calls anywhere.** `narrative.py` is templated string
   generation only — this is a hard PRD constraint, not a style choice.
4. **Table-driven logic, not if/elif chains.** Source priority
   (`SOURCE_PRIORITY`), reliability (`SOURCE_RELIABILITY`), and
   entity-value extraction should be dicts/tables that other modules can
   import and extend, not inline conditionals duplicated per file.
5. **Pure functions in `app/core/`.** No global mutable state, no
   FastAPI imports in `app/core/*` — the API layer (`app/api/routes.py`)
   is the only place that touches HTTP/requests. This keeps `core/`
   independently testable and reusable from a CLI.
6. **Event IDs are content hashes**, not random — `sha256(source + "|" +
   timestamp_iso + "|" + canonical_json(data))`. Needed for dedup and for
   replay-diff to compare runs meaningfully.
7. **Every module file already has a full docstring specifying exactly
   what to implement** — read it in full before generating code, and
   implement the named function signatures exactly (don't rename).

## Build order (respect this — later files depend on earlier ones)

1. `app/core/models.py` — already complete, do not regenerate.
2. `app/core/scoring.py` — already complete, do not regenerate.
3. `app/core/ingest.py`
4. `app/core/reorder.py`
5. `app/core/conflict.py` (depends on scoring.py + reorder.py output shape)
6. `app/core/narrative.py`
7. `app/core/audit.py` (depends on narrative.py)
8. `app/core/replay.py` (wires reorder -> conflict -> audit into one call)
9. `app/core/diff.py` (depends on replay.py's ReconciliationRun)
10. `app/api/routes.py` (thin wrapper over everything above)
11. `backend/tests/test_edgecases.py` — fill in the `pytest.skip` stubs
12. Frontend components (see frontend section of this doc)

## Frontend context (paste when generating React components)

- Theme tokens live in `frontend/src/theme/theme.ts` — import colors from
  there, never hardcode hex values in components.
- Use `motion.dev` (the `motion` package, formerly Framer Motion) for:
  - Timeline: `layout` prop on event nodes so reordering animates.
  - Conflict resolution: losing events fade + gray out, winner gets a
    yellow glow (`boxShadow` animate) + the `rule_applied` string typing
    in via staggered character animation.
  - Audit trail: accordion expand via `AnimatePresence` + staggered
    children for the narrative text and score breakdown.
  - Replay scrubber: a horizontal timeline with a draggable playhead;
    dragging a new event card onto it triggers `/replay/{run_id}` and
    then renders the diff panel from `/diff`.
- API client: `frontend/src/api/client.ts` — typed fetch wrappers matching
  `docs/API.md` exactly. Keep response types mirrored from
  `backend/app/core/models.py` (manually kept in sync for this project's
  scope — no codegen needed).
- Component tree (see `frontend/src/components/` stubs for props/purpose):
  `Timeline`, `ConflictCard`, `AuditAccordion`, `ScoreBreakdownBar`,
  `ReplayScrubber`, `DiffPanel`.

## What "done" looks like for the MVP

- `pytest -v` in `backend/` passes all tests in `test_edgecases.py`.
- `POST /reconcile` on `samples/01_conflicting_port_status.json` returns a
  `ReconciliationRun` where snort's `open` reading wins with a visible
  `ScoreBreakdown`.
- Running `/reconcile` on sample 05, then `/replay` with 05b injected,
  then `/diff` between the two runs, shows the port flipping from
  `closed` to `open` with a narrative reason mentioning snort.
- Frontend renders that same scenario end-to-end with the timeline,
  conflict highlight, and diff panel animating via motion.dev in the
  yellow/black theme.
