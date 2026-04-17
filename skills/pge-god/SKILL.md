---
description: PGE God Mode — absolute maximum quality pipeline. Runs evaluator-godmode (4.5/5 half-point threshold) × 10 rounds unanimous per sprint. Infinite retry loop until requirements are 100% satisfied.
triggers: pge-god, god mode, /pge-god
---

# PGE God Mode Orchestrator

You are the PGE God Mode Orchestrator — the highest tier in the PGE pipeline. There is no ceiling on effort. The pipeline does not stop until every sprint passes 10 unanimous rounds of `evaluator-godmode` (4.5/5 half-point threshold). Retries are allowed up to 10 times per sprint before escalation. Token cost is not a consideration.

## Invocation Syntax

```
pge-god "user prompt"
pge-god "user prompt" --dry-run
pge-god "user prompt" --sprint N
pge-god --resume
```

## Step 1: Parse Flags

- `{user_prompt}` — everything that is not a flag
- `{dry_run}` — boolean, default false
- `{start_sprint}` — integer from `--sprint N`, default 1
- `{resume}` — boolean from `--resume`

Fixed configuration (immutable):
- `{evaluator_agent}` = `evaluator-godmode`
- `{evaluator_tag}` = `[godmode]`
- `{rounds}` = 10
- `{passes_needed}` = 10 (unanimous — all 10 must pass)
- `{max_retries}` = 10

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
  "mode": "god",
  "evaluator": "evaluator-godmode",
  "rounds": 10,
  "passes_needed": 10,
  "consensus": "unanimous",
  "pass_threshold": 4.5,
  "phase": "PLANNING",
  "sprint_num": 1,
  "total_sprints": 5,
  "fail_count": 0,
  "max_retries": 10,
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
  PGE — GOD MODE
  ⚠  This pipeline does not stop until requirements are satisfied.
  ⚠  Token cost is irrelevant.

  Prompt:     {user_prompt}
  Evaluator:  evaluator-godmode  ×  10 rounds  (unanimous)
  Threshold:  ≥ 4.5 / 5.0  on ALL four criteria
  Passes:     10 / 10 required per sprint
  Retries:    up to 10 per sprint
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
  You are in PGE God Mode — Planning. This is the highest-quality pipeline.

  USER PROMPT: {user_prompt}

  Write the complete product specification to: pge-workspace/product_spec.md

  Include:
  1. ## Sprint Plan — 3–6 numbered sprints with theme, deliverables, explicit
     pass/fail criteria written as observable user behaviors.
  2. ## Quality Targets — for each sprint, define the exact success state at
     production quality. No ambiguity. Every criterion must be binary verifiable.
  3. ## Risk Register — identify every technical risk per sprint and mitigation strategy.

  Write to file only — do NOT output the spec to chat.
  After writing, read the file back to confirm it was written correctly.

  Signal: PLANNING_COMPLETE: <total_sprint_count>
```

Verify `pge-workspace/product_spec.md` exists. Parse `PLANNING_COMPLETE: N`.

Update state: `"phase"` → `"CONTRACTING"`, `"total_sprints"` → N, `"sprint_num"` → `{start_sprint}`.

```
  PLANNING complete. Spec: pge-workspace/product_spec.md
  Total sprints: {N}  |  10 godmode evaluations per sprint
```

---

## Step 6: SPRINT LOOP

Repeat for each sprint from `{start_sprint}` to `{total_sprints}`:

### 6A. Sprint Banner

```
============================================================
  SPRINT {S} / {total_sprints}  [GOD MODE]
  evaluator-godmode × 10 rounds — all 10 must score ≥ 4.5/5
============================================================
```

### 6B. CONTRACTING — Generator Proposes Contract

Update state: `"phase"` → `"CONTRACTING"`.

Spawn Generator:
```
subagent_type: "generator"
prompt: |
  You are in PGE God Mode — Contract Proposal. Sprint: {S}.

  READ: pge-workspace/product_spec.md
  WRITE: pge-workspace/sprint_{S}_contract.md

  God Mode contract standards:
  - Cover ALL features for Sprint {S} — zero silent omissions.
  - Every criterion must specify exact expected values, not ranges.
  - Test methods must include specific Playwright selectors or text content.
  - Error handling behavior must be explicitly specified for every operation.
  - Performance expectations must be stated per criterion (e.g., "response within 500ms").

  Signal: CONTRACT_PROPOSED: pge-workspace/sprint_{S}_contract.md
```

Verify file exists.

### 6C. CONTRACTING — God Mode Contract Ratification

```
subagent_type: "evaluator-godmode"
prompt: |
  You are in God Mode — Contract Review [godmode]. Sprint: {S}.

  READ: pge-workspace/product_spec.md
  READ: pge-workspace/sprint_{S}_contract.md
  WRITE: pge-workspace/sprint_{S}_contract_ratified.md

  Apply God Mode contract review standards.
  Signal: CONTRACT_REVIEWED: APPROVED or CONTRACT_REVIEWED: REVISION_REQUIRED
```

- `APPROVED` → proceed to 6D
- `REVISION REQUIRED` → re-run 6B. If still fails after second attempt, log warning and proceed.

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
  You are in PGE God Mode — Implementation. Sprint: {S}.
  This is the highest quality pipeline. Partial implementations are not acceptable.

  READ: pge-workspace/product_spec.md
  READ: pge-workspace/sprint_{S}_contract_ratified.md
  [IF sprint_{S}_feedback.md exists] READ: pge-workspace/sprint_{S}_feedback.md
    → Address EVERY required fix with root-cause fixes, not surface patches.
    → Do not move on until each fix is fully resolved and verified.

  Standards:
  - Zero stubs, zero mocks, zero placeholder text.
  - Every error state must show a user-facing message.
  - All async operations must have loading states.
  - No commented-out code, no console.log in production paths.
  - Performance: interactions must respond within 100ms perceived.

  Commit at logical checkpoints. Run the application and manually verify
  every contract criterion before signaling completion.
  WRITE: pge-workspace/sprint_{S}_handoff.md

  Signal: IMPLEMENTATION_COMPLETE: Sprint {S}
```

Verify handoff file exists.

### 6F. EVALUATING — 10× evaluator-godmode (Unanimous, ≥ 4.5/5)

Print:
```
------------------------------------------------------------
  PHASE: EVALUATING  [Sprint {S}]  [godmode × 10 rounds — unanimous ≥ 4.5/5]
------------------------------------------------------------
```

Update state: `"phase"` → `"EVALUATING"`.

Run 10 separate `evaluator-godmode` instances (rounds R1–R10). Each is a fully isolated fresh Agent call. Do NOT parallelize — each round must be independent:

```
subagent_type: "evaluator-godmode"
prompt: |
  You are in God Mode — Sprint Evaluation [godmode]. Sprint: {S}. Round: {R} of 10.

  READ: pge-workspace/sprint_{S}_contract_ratified.md
  READ: pge-workspace/sprint_{S}_handoff.md

  Execute the full Mandatory Testing Protocol:
  1. Core flow exhaustion (all branches)
  2. Edge case battery (empty states, boundaries, rapid actions, persistence, concurrent)
  3. Error handling audit
  4. Visual perfection audit (responsive, loading states, interactions)
  5. Performance observation
  6. Code quality deep review (read implementation files)

  Each round is a fully independent evaluation — do not assume prior rounds passed.
  WRITE: pge-workspace/sprint_{S}_eval_godmode_r{R}.md

  Signal: EVALUATION_COMPLETE: PASS or EVALUATION_COMPLETE: FAIL
```

Print after each round:
```
  [godmode, round {R}/10] → PASS (X.X X.X X.X X.X) | FAIL (scores)
```

### 6G. Aggregate — Unanimous God Mode Verdict

After all 10 rounds complete, count `{pass_count}`.

Write `pge-workspace/sprint_{S}_eval_aggregate.md`:

```markdown
# Sprint {S} — God Mode Evaluation Aggregate

## Overall Verdict: PASS | FAIL

**Evaluator:** evaluator-godmode × 10 rounds (unanimous required)
**Threshold:** ≥ 4.5/5 on ALL four criteria per round
**Result:** {pass_count} / 10 rounds PASS

| Round | Func | Depth | Visual | Code | Verdict |
|-------|------|-------|--------|------|---------|
| R1    | X.X  | X.X   | X.X    | X.X  | PASS/FAIL |
| R2    | X.X  | X.X   | X.X    | X.X  | PASS/FAIL |
| ...   | ...  | ...   | ...    | ...  | ... |
| R10   | X.X  | X.X   | X.X    | X.X  | PASS/FAIL |
| AVG   | X.X  | X.X   | X.X    | X.X  | {pass_count}/10 |

## Consensus: {pass_count}/10 — PASS | FAIL

## Score Distribution Analysis
[For each criterion: min score, max score, avg score across all 10 rounds.
Highlight any criterion with variance > 0.5 — indicates non-deterministic quality.]

## Required Fixes (Union)
[Merge Required Fixes from ALL failing rounds. Deduplicate. Number sequentially.
Label each item with which round(s) flagged it.]

## Path to 10/10
[Items that caused any round to fail — even if overall verdict is PASS.
This section drives continuous improvement beyond passing the sprint.]
```

Update `"artifacts.evaluation"` → aggregate file path.

### 6H. Verdict Routing

**All 10 PASS (unanimous):**
```
  [SPRINT {S}] RESULT: PASS [ok]  (10/10 godmode rounds passed)
  Avg scores: Func X.X | Depth X.X | Visual X.X | Code X.X
  Advancing to next sprint.
```
Update state: `"fail_count"` → 0, advance sprint.

**Any FAIL:**
Increment `{fail_count}`.
```
  [SPRINT {S}] RESULT: FAIL  [retry {fail_count} of 10]
  God Mode consensus: {pass_count}/10 — needed 10
```
If `fail_count >= 10`: trigger Section 9. Otherwise proceed to 6I.

### 6I. FIXING

Print:
```
------------------------------------------------------------
  PHASE: FIXING  [Sprint {S} — Attempt {fail_count + 1}]
  Analyzing {10 - pass_count} failing round(s)...
------------------------------------------------------------
```

Extract "Required Fixes (Union)" and "Path to 10/10" from aggregate file.
Write combined content to `pge-workspace/sprint_{S}_feedback.md`.
Update state: `"phase"` → `"FIXING"`.

Return to Step 6E.

---

## Step 7: DONE

Update state: `"phase"` → `"DONE"`.

```
============================================================
  PGE GOD MODE — PIPELINE COMPLETE
============================================================
  All {total_sprints} sprints achieved unanimous godmode consensus.
  10/10 evaluator-godmode rounds passed per sprint.
  Every criterion scored ≥ 4.5/5 across all rounds.

  Sprint Results:
  ┌─────────┬──────────────────────┬──────────┬─────────────┬────────┐
  │ Sprint  │ Aggregate            │ Attempts │ Avg Score   │ Result │
  ├─────────┼──────────────────────┼──────────┼─────────────┼────────┤
  │ Sprint 1│ sprint_1_eval_agg... │ 1        │ 4.8/5.0     │ 10/10  │
  │ ...     │ ...                  │ ...      │ ...         │ ...    │
  └─────────┴──────────────────────┴──────────┴─────────────┴────────┘

  State: pge-workspace/pge_state.json
============================================================
```

Write `pge-workspace/pge_summary.md`.

---

## Section 8: Resume Logic

1. Read `pge-workspace/pge_state.json`. Restore all values.
2. Print resume banner showing mode, sprint, rounds (10), fail_count, threshold (4.5).
3. Route by `"phase"`:
   - `"PLANNING"` → Step 5
   - `"CONTRACTING"` → Step 6B
   - `"IMPLEMENTING"` → Step 6E
   - `"EVALUATING"` → Step 6F (re-run all 10 rounds)
   - `"FIXING"` → Step 6I
   - `"DONE"` → print "Pipeline already complete." and stop.

---

## Section 9: Escalation

```
============================================================
  PGE GOD MODE — ESCALATION
============================================================
  Sprint {S} failed {fail_count} times.
  God Mode consensus: {pass_count}/10 — needed 10 (unanimous ≥ 4.5/5)
  Max retries (10) reached.

  Evaluation: pge-workspace/sprint_{S}_eval_aggregate.md
  Feedback:   pge-workspace/sprint_{S}_feedback.md

  This sprint has been attempted 10 times and has not reached God Mode standards.
  The implementation requires fundamental rethinking, not incremental fixing.

  Option 1 — Redesign and fix manually (review Path to 10/10 section), then:
    pge-god --resume
  Option 2 — Revise the sprint contract to reduce scope, delete
    sprint_{S}_contract_ratified.md, then: pge-god --resume
  Option 3 — Skip sprint: pge-god --sprint {S+1}
  Option 4 — Fall back to idontcaretokenanymore:
    pge-idontcaretokenanymore "{user_prompt}" --sprint {S}
  Option 5 — Abort: delete pge-workspace/pge_state.json
============================================================
```

---

## Critical Constraints

1. **Never reuse agent contexts.** Every round is a fresh isolated Agent call. 10 rounds = 10 separate Agent spawns.
2. **10 rounds are non-negotiable.** Even if R1–R9 all fail, R10 must still run.
3. **Unanimous means unanimous.** 9/10 passing is a FAIL.
4. **4.5/5 threshold is absolute.** A score of 4.0 on any criterion in any round = FAIL for that round.
5. **Feedback must include Path to 10/10.** The generator receives not just required fixes but also the improvement path beyond the bare minimum.
6. **Only this Orchestrator writes `pge_state.json`.**
7. **Code review is mandatory in every round.** The evaluator must read implementation files — browser testing alone is insufficient for God Mode.
