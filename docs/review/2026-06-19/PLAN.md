# servus verification review — 2026-06-19

Single source of truth for this multi-agent verification pass. A fresh Claude
Code session — or any individual reviewer agent — can resume from this file plus
its own `progress/<agent>.md`. Nothing depends on conversation memory.

This is a **verification** review of the app as it stands on branch
`explore/boxes-contain-items`. It mirrors the structure of the previous
`docs/review/pre-launch-2026-06-03/` pass, which you can read for prior findings
and continuity (many nits there may already be fixed — confirm, don't assume).

---

## 1. How resilience actually works (read this first)

Subagents **cannot** detect a usage limit and respawn themselves — a usage limit
stops the orchestrator and every child at once. Resilience here comes entirely
from **file-based checkpointing**, not self-respawning:

- Every agent owns exactly two files: `progress/<agent>.md` (a checklist of the
  areas it must cover) and `findings/<agent>.md` (its appended findings).
- An agent **checkpoints after every single area**: it appends findings to disk
  and ticks the checklist item *before* moving to the next area. It never holds
  results only in its head.
- **Resuming after any interruption** (usage reset, crash, manual stop) is:
  re-spawn the agent with its prompt file `prompts/<agent>.md`. Its first action
  is always to read `progress/<agent>.md` and continue from the first unchecked
  item. No work is lost; no work is redone.

So "respawn after limit" = wait for the limit to reset, then re-run the same
spawn command. The prompts are written to make that idempotent.

---

## 2. Phases

Phase 1 is your priority and runs first. Review its output before spending on
Phase 2.

### Phase 1 — Experience (needs the running app, model: **Opus**)

Runs as a **sequential, building pipeline** — quality over speed. Each stage
depends on the previous one finishing:

| Order | Agent  | Owns | Depends on | Prompt |
| ----- | ------ | ---- | ---------- | ------ |
| 1     | `ui`   | Independent visual + clarity pass: layout, spacing/styling bugs, typography, theme, responsive, tap targets, contrast/a11y, empty/loading/error states, print/label pages, "is this understandable?". | — | `prompts/ui.md` |
| 2     | `ux`   | **First** an independent flow pass (friction, dead ends, redundant paths, manual-entry & config smoothness, personas), **then** ingest UI's findings and reconcile. | `ui` complete | `prompts/ux.md` |
| 3     | `uiux` | Synthesis: combine both reports, dedupe, reconcile disagreements, find cross-cutting root causes, re-prioritize against the move-day rubric, produce the single consolidated report. | `ui` + `ux` complete | `prompts/uiux.md` |

**Anti-anchoring rule:** `ux` must form and write its own findings before reading
`findings/ui.md`. `uiux` is the only agent that starts from the others' outputs.

### Phase 2 — Code & correctness (static, model: **Sonnet**)

| Agent       | Owns | Prompt |
| ----------- | ---- | ------ |
| `frontend`  | Islands vs components, signals/hydration, markup semantics & a11y, i18n compliance (no inline strings), CSS architecture, Fresh 2 idioms. | `prompts/frontend.md` |
| `backend`   | Thin routes / `lib` business logic, KV access patterns, auth/session/CSRF/rate-limit vs CLAUDE.md §8, error handling, API routes. | `prompts/backend.md` |
| `database`  | KV key schema & index consistency, atomic multi-key writes, **migration safety for live data**, export/import integrity, orphan risks (containment/groups/boxes). | `prompts/database.md` |
| `docs`      | README / CLAUDE.md / ROADMAP accuracy, spec-vs-implementation drift across the 14 specs, stale claims, decision records. | `prompts/docs.md` |

---

## 3. Status table (orchestrator updates this)

| Agent     | Phase | Model  | Status      | Last checkpoint | Findings (B/Ma/Mi/N) |
| --------- | ----- | ------ | ----------- | --------------- | -------------------- |
| ui        | 1 (order 1) | Opus | complete    | Summary written | 0/8/16/3 |
| ux        | 1 (order 2) | Opus | complete    | Summary written | 1/13/17/1 |
| uiux      | 1 (order 3) | Opus | complete    | Summary + Observations written | 1/13/~21/~3 |
| frontend  | 2     | Sonnet | complete    | Summary written | 0/2/8/8 |
| backend   | 2     | Sonnet | complete    | Summary written | 1/1/2/2 |
| database  | 2     | Sonnet | complete    | Summary written | 1/6/7/5 |
| docs      | 2     | Sonnet | complete    | Summary written | 0/3/9/6 |

Status values: `not started` → `in progress` → `complete`. "Last checkpoint" =
the last ticked checklist item, so a resumer knows where to look.

---

## 4. Hard rules (apply to every agent)

1. **Never touch production.** Do not connect to, navigate to, or mutate
   `servus.valor.codes` or any real/remote KV. The live app holds real data.
2. **Local KV is a disposable sandbox.** Your `DENO_KV_PATH` points at a throw-
   away SQLite file. You may freely create boxes/items/etc. there to exercise
   flows — that is the point. Just never point at anything real.
3. **Verify, don't edit.** This is a review. Do not modify app source, specs, or
   tests. The only files you write are your own `progress/` and `findings/`.
4. **Anchor to specs.** Tag every finding's relation to the 14 specs in
   `openspec/specs/`: `spec-violation` (app contradicts a spec),
   `spec-gap` (real issue no spec covers), or `quality` (within spec, still bad).
5. **German UI.** Copy is German via `t()`. Flag inline German/English strings in
   JSX as i18n violations (CLAUDE.md §11), but do not flag German copy itself as
   "untranslated".
6. **Checkpoint constantly.** See §1. One area = one append to findings + one
   tick in progress, before moving on.

---

## 5. Local boot recipe (Phase 1 agents)

The two Phase 1 agents are **parallel-safe** as long as each uses its own port,
its own KV file, and its own browser MCP server. Do not deviate from the
assignments below — they are what keeps the agents from colliding.

| Agent | PORT | DENO_KV_PATH | Browser MCP |
| ----- | ---- | ------------ | ----------- |
| `ui`  | 8000 | `/tmp/servus-review-ui.sqlite` | **chrome-devtools** (screenshots, `resize_page`, `lighthouse_audit`, a11y snapshot, console) |
| `ux`  | 8001 | `/tmp/servus-review-ux.sqlite` | **playwright** (`browser_snapshot`, `fill_form`, click-by-role, `browser_wait_for`) |

```bash
# From repo root. Isolated throwaway KV — NOT production. Fresh 2's
# builder.listen() honors the PORT env var. Use YOUR agent's values from above.
export SERVUS_SESSION_KEY=$(openssl rand -hex 32)
export SERVUS_SEED_USERS='[{"username":"testuser","password":"TestPw!1234"}]'
export PORT=8000                                        # ui=8000, ux=8001
export DENO_KV_PATH=/tmp/servus-review-ui.sqlite        # ui or ux file
rm -f "$DENO_KV_PATH"                                   # start clean each run
deno task dev                                           # serves http://localhost:$PORT
```

Log in at `http://localhost:<your-port>/login` as `testuser` / `TestPw!1234`. The
seeded KV starts empty — create a handful of rooms, boxes, items, and a custom
category schema through the UI so screens have realistic content (this doubles as
flow testing). Optionally import sample data via `/admin` (NDJSON).

Load your assigned browser MCP's tool schemas with `ToolSearch` first (the tools
are deferred). Do **not** use the other agent's MCP — that's what shares a browser
and causes collisions. Test at mobile **390×844** (primary device — the owner and
his wife use phones) and desktop **1280×800**.

---

## 6. Finding format (used in every `findings/<agent>.md`)

Append each finding as:

```
### [SEVERITY] short title
- **Where:** route / file:line / screen
- **Relation:** spec-violation (<spec>) | spec-gap | quality
- **Evidence:** what was observed (screenshot path, snippet, repro steps)
- **Recommendation:** concrete fix
```

### Severity rubric (calibrate against move-day reality)

Rate by *impact on real use during the move*, not by how much it annoys you:

- **BLOCKER** — a core move-day task can't be completed, or data is lost/at risk,
  or a security rule (CLAUDE.md §8) is broken. E.g. a helper can't pack/label a
  box; manually entering an item's fields fails; an edit silently discards data.
- **MAJOR** — the task completes but with real friction or wrong behavior that a
  daily user (the wife) hits repeatedly. E.g. two competing ways to do one thing
  that confuse; a form that's tedious enough she'd avoid it; a clearly wrong
  layout on the phone.
- **MINOR** — noticeable and worth fixing, but the user works around it without
  much thought.
- **NIT** — pure polish; no functional impact.

### Findings vs Observations (keep them separate)

Only report **defects** as findings with a severity — something is broken, wrong,
confusing, or inconsistent. Subjective taste ("I'd prefer a different blue") is
**not** a finding. Put taste/ideas in an `## Observations` section at the end of
your file so they don't dilute the triage. When unsure, ask: "would a real user
be worse off, or do I just have a different preference?" If the latter →
Observations.

End each file with a `## Summary` once all areas are done: counts per severity +
the top 3 things to fix, then the `## Observations` section.
