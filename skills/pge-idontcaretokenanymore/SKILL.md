---
description: PGE idontcaretokenanymore — premium unlimited-token pipeline. Runs evaluator-quality × 5 rounds unanimous consensus per sprint. Maximum quality, token cost irrelevant.
triggers: pge-idontcaretokenanymore, idontcaretokenanymore, /pge-idontcaretokenanymore
---

# PGE idontcaretokenanymore Orchestrator

You are the PGE idontcaretokenanymore Orchestrator. Token cost is irrelevant. Quality is the only priority. Every sprint is evaluated by `evaluator-quality` five times — all five must pass unanimously. Retries are allowed up to 5 times per sprint before escalation.

## Invocation Syntax

```
pge-idontcaretokenanymore "user prompt"
pge-idontcaretokenanymore "user prompt" --dry-run
pge-idontcaretokenanymore "user prompt" --sprint N
pge-idontcaretokenanymore --resume
```

## Step 1: Parse Flags

- `{user_prompt}` — everything that is not a flag
- `{dry_run}` — boolean, default false
- `{start_sprint}` — integer from `--sprint N`, default 1
- `{resume}` — boolean from `--resume`

Fixed configuration (not user-configurable):
- `{evaluator_agent}` = `evaluator-quality`
- `{evaluator_tag}` = `[quality]`
- `{rounds}` = 5
- `{passes_needed}` = 5 (unanimous — all 5 must pass)
- `{max_retries}` = 5

## Step 2: Initialize Working Directory

```bash
mkdir -p pge-workspace
```

## Step 3: Initialize or Load State

If `pge-workspace/pge_state.json` exists and `--resume` was NOT passed:
```
============================================================
  WARNING: An existing PGE session was found.
  Use --resume to continue, or delete pge-workspace/ to start fresh.
============================================================
```
Stop.

Create `pge-workspace/pge_state.json`:
```json
{
  "mode": "idontcaretokenanymore",
  "evaluator": "evaluator-quality",
  "rounds": 5,
  "passes_needed": 5,
  "consensus": "unanimous",
  "phase": "PLANNING",
  "sprint_num": 1,
  "total_sprints": 5,
  "fail_count": 0,
  "max_retries": 5,
  "last_checkpoint": "<ISO timestamp>",
  "artifacts": {
    "spec": "pge-workspace/product_spec.md",
    "contract": "",
    "evaluation": "",
    "feedback": ""
  },
  "contract_warnings": []
}
```

## Step 4: Print Pipeline Banner

```
============================================================
  PGE — idontcaretokenanymore MODE
  Prompt:     {user_prompt}
  Evaluator:  evaluator-quality  ×  5 rounds  (unanimous)
  Passes:     5 / 5 required per sprint
  Retries:    up to 5 per sprint
  Tokens:     irrelevant
  State:      pge-workspace/pge_state.json
============================================================
```

## Step 5: PLANNING Phase

Print:
```
------------------------------------------------------------
  PHASE: PLANNING
------------------------------------------------------------
```

Spawn Planner:
```
subagent_type: "planner"
prompt: |
  You are in PGE Mode — Planning.

  USER PROMPT: {user_prompt}

  Write the complete product specification to: pge-workspace/product_spec.md
  Include a ## Sprint Plan section with 3–6 numbered sprints, each with a theme,
  deliverables, and explicit pass/fail criteria.
  Write to file only — do NOT output the spec to chat.
  After writing, read the file back to confirm it was written correctly.

  Signal: PLANNING_COMPLETE: <total_sprint_count>
```

Verify `pge-workspace/product_spec.md` exists. Parse `PLANNING_COMPLETE: N`.

Update state: `"phase"` → `"CONTRACTING"`, `"total_sprints"` → N, `"sprint_num"` → `{start_sprint}`.

```
  PLANNING complete. Spec: pge-workspace/product_spec.md
  Total sprints: {N}  |  5 quality evaluations per sprint
```

## Step 6: SPRINT LOOP

Repeat for each sprint from `{start_sprint}` to `{total_sprints}`:

### 6A. Sprint Banner

```
============================================================
  SPRINT {S} / {total_sprints}  [idontcaretokenanymore]
  evaluator-quality × 5 rounds — all 5 must pass
============================================================
```

### 6B. CONTRACTING — Generator Proposes Contract

Update state: `"phase"` → `"CONTRACTING"`.

Spawn Generator:
```
subagent_type: "generator"
prompt: |
  You are in PGE Mode — Contract Proposal. Sprint: {S}.

  READ: pge-workspace/product_spec.md
  WRITE: pge-workspace/sprint_{S}_contract.md

  Cover ALL features designated for Sprint {S} in the spec — no silent omissions.
  Criteria must be observable user behaviors, not implementation details.
  Include a Test Method with concrete Playwright steps for every criterion.

  Signal: CONTRACT_PROPOSED: pge-workspace/sprint_{S}_contract.md
```

Verify file exists.

### 6C. CONTRACTING — Evaluator Ratifies Contract

```
subagent_type: "evaluator-quality"
prompt: |
  You are in PGE Mode — Contract Review [quality]. Sprint: {S}.

  READ: pge-workspace/product_spec.md
  READ: pge-workspace/sprint_{S}_contract.md
  WRITE: pge-workspace/sprint_{S}_contract_ratified.md

  Signal: CONTRACT_REVIEWED: APPROVED or CONTRACT_REVIEWED: REVISION_REQUIRED
```

- `APPROVED` → proceed to 6D
- `REVISION REQUIRED` → re-run 6B once. If still fails, log warning and proceed.

### 6D. Dry-Run Check

If `{dry_run}`:
```
  [DRY-RUN] Sprint {S} contract ratified. Skipping implementation.
```
Advance to next sprint.

### 6E. IMPLEMENTING

Print:
```
------------------------------------------------------------
  PHASE: IMPLEMENTING  [Sprint {S}]
------------------------------------------------------------
```

Update state: `"phase"` → `"IMPLEMENTING"`.

Check for `pge-workspace/sprint_{S}_feedback.md`.

Spawn Generator:
```
subagent_type: "generator"
prompt: |
  You are in PGE Mode — Implementation. Sprint: {S}.

  READ: pge-workspace/product_spec.md
  READ: pge-workspace/sprint_{S}_contract_ratified.md
  [IF sprint_{S}_feedback.md exists] READ: pge-workspace/sprint_{S}_feedback.md
    → Address EVERY required fix listed before writing any new code.

  No stubs, no mocks, no placeholder text — every feature must be fully functional.
  Commit at logical checkpoints. Run the application to verify it starts before signaling.
  WRITE: pge-workspace/sprint_{S}_handoff.md

  Signal: IMPLEMENTATION_COMPLETE: Sprint {S}
```

Verify handoff file exists.

### 6F. EVALUATING — 5× evaluator-quality (Unanimous)

Print:
```
------------------------------------------------------------
  PHASE: EVALUATING  [Sprint {S}]  [quality × 5 rounds — unanimous]
------------------------------------------------------------
```

Update state: `"phase"` → `"EVALUATING"`.

Run 5 separate evaluator-quality instances (rounds R1–R5). Each is a fresh isolated Agent call:

```
subagent_type: "evaluator-quality"
prompt: |
  You are in PGE Mode — Sprint Evaluation [quality]. Sprint: {S}. Round: {R} of 5.

  READ: pge-workspace/sprint_{S}_contract_ratified.md
  READ: pge-workspace/sprint_{S}_handoff.md
  Start the application per handoff instructions. Test via Playwright — do NOT rely on
  code inspection alone. Probe edge cases: empty states, invalid inputs, page refresh,
  navigation back/forward. Each round is independent — do not assume prior rounds passed.
  WRITE: pge-workspace/sprint_{S}_eval_quality_r{R}.md

  Signal: EVALUATION_COMPLETE: PASS or EVALUATION_COMPLETE: FAIL
```

Print after each round:
```
  [quality, round {R}] → PASS | FAIL
```

### 6G. Aggregate — Unanimous Verdict

After all 5 rounds complete:

Count `{pass_count}` from the 5 evaluation files.

Write `pge-workspace/sprint_{S}_eval_aggregate.md`:
```markdown
# Sprint {S} — idontcaretokenanymore Evaluation Aggregate

## Overall Verdict: PASS | FAIL

**Evaluator:** evaluator-quality × 5 rounds (unanimous required)
**Result:** {pass_count} / 5 rounds PASS

| Round | Verdict |
|-------|---------|
| R1    | PASS/FAIL |
| R2    | PASS/FAIL |
| R3    | PASS/FAIL |
| R4    | PASS/FAIL |
| R5    | PASS/FAIL |
| TOTAL | {pass_count}/5 — PASS/FAIL |

## Required Fixes (Union)
[Merge Required Fixes from all failing rounds. Deduplicate. Number sequentially.]

## Round Variance Analysis
[Note any criteria where scores differed across rounds — borderline implementations
that passed some rounds but failed others must be addressed even if overall verdict is PASS.]
```

Update `"artifacts.evaluation"` → aggregate file path.

### 6H. Verdict Routing

**All 5 PASS (unanimous):**
```
  [SPRINT {S}] RESULT: PASS [ok]  (5/5 quality rounds passed)
  Advancing to next sprint.
```
Update state: `"fail_count"` → 0, advance sprint. 

**Any FAIL:**
Increment `{fail_count}`.
```
  [SPRINT {S}] RESULT: FAIL  [retry {fail_count} of 5]
  Quality consensus: {pass_count}/5 passed — needed 5
```
If `fail_count >= 5`: trigger Section 9. Otherwise proceed to 6I.

### 6I. FIXING

Print:
```
------------------------------------------------------------
  PHASE: FIXING  [Sprint {S} — Attempt {fail_count + 1}]
------------------------------------------------------------
```

Extract "Required Fixes (Union)" from aggregate file. Write to `sprint_{S}_feedback.md`.
Update state: `"phase"` → `"FIXING"`.

Return to Step 6E.

---

## Step 7: DONE

Update state: `"phase"` → `"DONE"`.

```
============================================================
  PGE idontcaretokenanymore — PIPELINE COMPLETE
============================================================
  All {total_sprints} sprints passed unanimous quality consensus.

  Sprint Results:
  ┌─────────┬──────────────────────┬──────────┬────────┐
  │ Sprint  │ Aggregate            │ Attempts │ Result │
  ├─────────┼──────────────────────┼──────────┼────────┤
  │ Sprint 1│ sprint_1_eval_agg... │ 1        │ 5/5    │
  │ ...     │ ...                  │ ...      │ ...    │
  └─────────┴──────────────────────┴──────────┴────────┘

  State: pge-workspace/pge_state.json
============================================================
```

Write `pge-workspace/pge_summary.md`.

---

## Section 8: Resume Logic

1. Read `pge-workspace/pge_state.json`. Restore all values.
2. Print resume banner showing mode, sprint, rounds, fail_count.
3. Route by `"phase"`:
   - `"PLANNING"` → Step 5
   - `"CONTRACTING"` → Step 6B
   - `"IMPLEMENTING"` → Step 6E
   - `"EVALUATING"` → Step 6F (re-run all 5 rounds)
   - `"FIXING"` → Step 6I
   - `"DONE"` → print "Pipeline already complete." and stop.

---

## Section 9: Escalation

```
============================================================
  PGE idontcaretokenanymore — ESCALATION
============================================================
  Sprint {S} failed {fail_count} times.
  Quality consensus: {pass_count}/5 — needed 5 (unanimous)
  Max retries (5) reached.

  Evaluation: pge-workspace/sprint_{S}_eval_aggregate.md
  Feedback:   pge-workspace/sprint_{S}_feedback.md

  Option 1 — Fix manually, then: pge-idontcaretokenanymore --resume
  Option 2 — Revise contract, delete sprint_{S}_contract_ratified.md, then: pge-idontcaretokenanymore --resume
  Option 3 — Skip sprint: pge-idontcaretokenanymore --sprint {S+1}
  Option 4 — Abort: delete pge-workspace/pge_state.json
============================================================
```

---

## Critical Constraints

1. **Never reuse agent contexts.** Every round is a fresh isolated Agent call.
2. **5 rounds are non-negotiable.** Never reduce rounds even if R1–R4 all fail.
3. **Unanimous means unanimous.** 4/5 passing is a FAIL.
4. **Round Variance Analysis is mandatory.** Implementations that pass some rounds but fail others have non-deterministic quality.
5. **Only this Orchestrator writes `pge_state.json`.**
