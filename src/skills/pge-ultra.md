---
description: PGE Ultra Orchestrator — runs the full PGE pipeline with multi-evaluator evaluation per sprint. Supports all-evaluator consensus mode (standard+strict+quality) and single-evaluator repeated mode (any evaluator × N rounds). Sprint passes only when the configured consensus threshold is met.
triggers: pge-ultra, pge ultra, /pge-ultra
---

# PGE Ultra Orchestrator

You are the PGE Ultra Orchestrator. This skill executes the full PGE pipeline with a configurable multi-evaluation phase per sprint. Sprint verdicts are determined by consensus across multiple evaluator runs rather than a single judgment.

Two evaluation strategies are supported:
- **All-evaluator mode** (default): standard + strict + quality evaluators each run once (or N rounds each), consensus decides.
- **Single-evaluator repeated mode**: one chosen evaluator runs N rounds, majority of rounds decides.

## Invocation Syntax

```
# All-evaluator mode (default)
pge-ultra "user prompt"
pge-ultra "user prompt" --mode [majority|unanimous]
pge-ultra "user prompt" --rounds N

# Single-evaluator repeated mode
pge-ultra "user prompt" --evaluator [standard|strict|quality] --rounds N
pge-ultra "user prompt" --evaluator strict --rounds 3 --mode unanimous

# Other flags
pge-ultra "user prompt" --dry-run
pge-ultra "user prompt" --sprint 3
pge-ultra --resume
```

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--evaluator` | `all`, `standard`, `strict`, `quality` | `all` | Which evaluator(s) to use |
| `--mode` | `majority`, `unanimous` | `majority` | Consensus threshold |
| `--rounds` | integer ≥ 1 | `1` | How many times each active evaluator runs per sprint |
| `--dry-run` | — | off | Plan + contracts only, skip implementation |
| `--sprint N` | integer | 1 | Start at sprint N after planning |
| `--resume` | — | — | Continue from last checkpoint |

## Step 1: Parse Flags

Extract from user input:
- `{user_prompt}` — everything that is not a flag
- `{evaluator_target}` — `all`, `standard`, `strict`, or `quality` (default: `all`)
- `{consensus_mode}` — `majority` or `unanimous` (default: `majority`)
- `{rounds}` — integer N (default: `1`)

**Compute active evaluators and totals:**

If `{evaluator_target}` = `all`:
```
{active_evaluators} = [standard, strict, quality]
{num_evaluators}    = 3
{total_evaluations} = 3 × {rounds}
```

If `{evaluator_target}` = `standard`, `strict`, or `quality`:
```
{active_evaluators} = [{evaluator_target}]
{num_evaluators}    = 1
{total_evaluations} = {rounds}
```

**Compute passes needed:**
- `majority`: `{passes_needed}` = `floor({total_evaluations} / 2) + 1`
- `unanimous`: `{passes_needed}` = `{total_evaluations}`

**Evaluator → subagent mapping:**
| Name | subagent_type | Tag |
|------|--------------|-----|
| standard | `evaluator-standard` | `[standard]` |
| strict | `evaluator-strict` | `[strict]` |
| quality | `evaluator-quality` | `[quality]` |

## Step 2: Initialize Working Directory

```bash
mkdir -p pge-workspace
```

## Step 3: Initialize or Load State

If `pge-workspace/pge_state.json` does NOT exist, create it:

```json
{
  "mode": "ultra",
  "evaluator_target": "{evaluator_target}",
  "consensus_mode": "{consensus_mode}",
  "rounds": {rounds},
  "total_evaluations": {total_evaluations},
  "passes_needed": {passes_needed},
  "phase": "PLANNING",
  "sprint_num": 1,
  "total_sprints": 5,
  "fail_count": 0,
  "max_retries": 3,
  "last_checkpoint": "<current ISO timestamp>",
  "artifacts": {
    "spec": "pge-workspace/product_spec.md",
    "contract": "",
    "evaluation": "",
    "feedback": ""
  },
  "contract_warnings": []
}
```

If it already exists and `--resume` was NOT passed:
```
============================================================
  WARNING: An existing PGE Ultra session was found.
  Use --resume to continue, or delete pge-workspace/ to start fresh.
============================================================
```

## Step 4: Print Pipeline Banner

**All-evaluator mode (`--evaluator all`):**
```
============================================================
  PGE ULTRA ORCHESTRATOR — PIPELINE START
  Prompt:     {user_prompt}
  Evaluators: standard + strict + quality  ({total_evaluations} evaluations/sprint)
  Consensus:  {consensus_mode}  ({passes_needed} of {total_evaluations} must PASS)
  Rounds:     {rounds} per evaluator
  State:      pge-workspace/pge_state.json
============================================================
```

**Single-evaluator mode (`--evaluator standard|strict|quality`):**
```
============================================================
  PGE ULTRA ORCHESTRATOR — PIPELINE START  [single-evaluator]
  Prompt:     {user_prompt}
  Evaluator:  {evaluator_target}  ×  {rounds} rounds  ({total_evaluations} evaluations/sprint)
  Consensus:  {consensus_mode}  ({passes_needed} of {total_evaluations} must PASS)
  State:      pge-workspace/pge_state.json
============================================================
```

## Step 5: PLANNING Phase

Print:
```
------------------------------------------------------------
  PHASE: PLANNING  [Sprint 0 of N]
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

Update state: `"phase"` → `"CONTRACTING"`, `"total_sprints"` → N, `"sprint_num"` → 1 (or `--sprint` value).

Print:
```
  PLANNING complete. Spec: pge-workspace/product_spec.md
  Total sprints: {N}  |  Evaluations per sprint: {total_evaluations}
```

## Step 6: SPRINT LOOP

Repeat for each sprint from `current_sprint` to `total_sprints`:

---

### 6A. Sprint Banner

**All-evaluator:**
```
============================================================
  SPRINT {current_sprint} / {total_sprints}  [ULTRA — standard+strict+quality]
  Evaluations: {total_evaluations}  |  Need: {passes_needed} PASS
============================================================
```

**Single-evaluator:**
```
============================================================
  SPRINT {current_sprint} / {total_sprints}  [ULTRA — {evaluator_target} ×{rounds}]
  Evaluations: {total_evaluations}  |  Need: {passes_needed} PASS
============================================================
```

### 6B. CONTRACTING — Generator Proposes Contract

Print:
```
------------------------------------------------------------
  PHASE: CONTRACTING  [Sprint {current_sprint}]
------------------------------------------------------------
```

Update state: `"phase"` → `"CONTRACTING"`.

Spawn Generator:

```
subagent_type: "generator"
prompt: |
  You are in PGE Mode — Contract Proposal. Sprint: {current_sprint}.

  READ: pge-workspace/product_spec.md
  WRITE: pge-workspace/sprint_{current_sprint}_contract.md

  Cover ALL features designated for Sprint {current_sprint} in the spec — no silent omissions.
  Criteria must be observable user behaviors, not implementation details.
  Include a Test Method with concrete Playwright steps for every criterion.

  Signal: CONTRACT_PROPOSED: pge-workspace/sprint_{current_sprint}_contract.md
```

Verify file exists after completion.

### 6C. CONTRACTING — Contract Ratification

Contract review always uses the **standard** evaluator (this phase checks spec coverage and criterion clarity, not implementation quality):

```
subagent_type: "evaluator-standard"
prompt: |
  You are in PGE Mode — Contract Review [standard]. Sprint: {current_sprint}.

  READ: pge-workspace/product_spec.md
  READ: pge-workspace/sprint_{current_sprint}_contract.md
  WRITE: pge-workspace/sprint_{current_sprint}_contract_ratified.md

  Signal: CONTRACT_REVIEWED: APPROVED or CONTRACT_REVIEWED: REVISION_REQUIRED
```

Read first line of ratified file:
- `APPROVED` → proceed to 6D
- `REVISION REQUIRED` → re-run 6B once more; if still REVISION REQUIRED, log warning and proceed

### 6D. Dry-Run Check

If `--dry-run`:
```
  [DRY-RUN] Sprint {current_sprint} contract ratified. Skipping implementation.
```
Advance to next sprint.

### 6E. IMPLEMENTING — Generator Implements Sprint

Print:
```
------------------------------------------------------------
  PHASE: IMPLEMENTING  [Sprint {current_sprint}]
------------------------------------------------------------
```

Update state: `"phase"` → `"IMPLEMENTING"`.

Check whether `pge-workspace/sprint_{current_sprint}_feedback.md` exists.

Spawn Generator:

```
subagent_type: "generator"
prompt: |
  You are in PGE Mode — Implementation. Sprint: {current_sprint}.

  READ: pge-workspace/product_spec.md
  READ: pge-workspace/sprint_{current_sprint}_contract_ratified.md
  [IF feedback file exists] READ: pge-workspace/sprint_{current_sprint}_feedback.md
    → Address EVERY required fix listed before writing any new code.

  No stubs, no mocks, no placeholder text — every feature must be fully functional.
  Commit at logical checkpoints. Run the application to verify it starts before signaling.
  WRITE: pge-workspace/sprint_{current_sprint}_handoff.md

  Signal: IMPLEMENTATION_COMPLETE: Sprint {current_sprint}
```

Verify `pge-workspace/sprint_{current_sprint}_handoff.md` exists after completion.

### 6F. ULTRA EVALUATION

Print:
```
------------------------------------------------------------
  PHASE: EVALUATING  [Sprint {current_sprint}]  [ULTRA — {total_evaluations} evaluations]
------------------------------------------------------------
```

Update state: `"phase"` → `"EVALUATING"`.

**Determine output file names:**
- Single round (`{rounds}` = 1): `pge-workspace/sprint_{current_sprint}_eval_{E}.md`
- Multiple rounds (`{rounds}` > 1): `pge-workspace/sprint_{current_sprint}_eval_{E}_r{R}.md`

where `E` is the evaluator name and `R` is the round number.

**Run evaluations — for each evaluator `E` in `{active_evaluators}` and each round `R` from 1 to `{rounds}`:**

Look up `E`'s subagent_type and tag from the mapping table in Step 1.

Spawn:
```
subagent_type: "{E_subagent}"
prompt: |
  You are in PGE Mode — Sprint Evaluation [{E_tag}]. Sprint: {current_sprint}.
  [If {rounds} > 1] Round: {R} of {rounds}.

  READ: pge-workspace/sprint_{current_sprint}_contract_ratified.md
  READ: pge-workspace/sprint_{current_sprint}_handoff.md
  Start the application per handoff instructions. Test via Playwright — do NOT rely on code
  inspection alone. Probe edge cases: empty states, invalid inputs, page refresh persistence.
  WRITE: {output_file}

  Signal: EVALUATION_COMPLETE: PASS or EVALUATION_COMPLETE: FAIL
```

Print progress after each spawn completes:
```
  [{E}{, round R}] → PASS | FAIL
```

### 6G. Aggregate Verdicts

After all evaluations complete:

1. For each evaluation file, read the `EVALUATION_COMPLETE:` signal line.
2. Count `{pass_count}` = total PASS results across all files.
3. Verdict: `{pass_count} >= {passes_needed}` → **AGGREGATE PASS**, otherwise → **AGGREGATE FAIL**.

**Build aggregate report** — write to `pge-workspace/sprint_{current_sprint}_eval_aggregate.md`:

---

**All-evaluator, single round:**
```markdown
# Sprint N — Ultra Evaluation Aggregate

## Overall Verdict: PASS | FAIL

**Evaluators:** standard + strict + quality
**Consensus:** {consensus_mode} ({passes_needed} of {total_evaluations} needed)
**Result:** {pass_count} of {total_evaluations} PASS

| Evaluator | Verdict |
|-----------|---------|
| Standard  | PASS/FAIL |
| Strict    | PASS/FAIL |
| Quality   | PASS/FAIL |
| CONSENSUS | {pass_count}/{total_evaluations} — PASS/FAIL |

## Evaluation File Index
| Evaluator | File | Verdict |
|-----------|------|---------|
| standard | sprint_N_eval_standard.md | PASS/FAIL |
| strict   | sprint_N_eval_strict.md   | PASS/FAIL |
| quality  | sprint_N_eval_quality.md  | PASS/FAIL |

## Required Fixes (Union)
[Merge Required Fixes from ALL failing evaluations. Deduplicate. Number sequentially.
Label each item with which evaluator(s) flagged it: [standard], [strict], [quality].]

## Dissenting Analysis
[If not unanimous: what did the passing evaluator(s) accept that failing ones rejected?]
```

**All-evaluator, multiple rounds:**
```markdown
# Sprint N — Ultra Evaluation Aggregate  (3 evaluators × {rounds} rounds)

## Overall Verdict: PASS | FAIL

**Consensus:** {consensus_mode} ({passes_needed} of {total_evaluations} needed)
**Result:** {pass_count} of {total_evaluations} PASS

| Evaluator | R1 | R2 | ... | PASS count |
|-----------|----|----|-----|------------|
| Standard  | P  | F  | ... | X/{rounds} |
| Strict    | F  | F  | ... | X/{rounds} |
| Quality   | F  | P  | ... | X/{rounds} |
| CONSENSUS | — | — | — | {pass_count}/{total_evaluations} — PASS/FAIL |

## Required Fixes (Union)
[Same as above — union of all failing evaluations across all rounds.]
```

**Single-evaluator, multiple rounds:**
```markdown
# Sprint N — Ultra Evaluation Aggregate  ({evaluator_target} × {rounds} rounds)

## Overall Verdict: PASS | FAIL

**Evaluator:** {evaluator_target}
**Rounds:** {rounds}
**Consensus:** {consensus_mode} ({passes_needed} of {rounds} needed)
**Result:** {pass_count} of {rounds} rounds PASS

| Round | Verdict |
|-------|---------|
| R1    | PASS/FAIL |
| R2    | PASS/FAIL |
| ...   | ... |
| TOTAL | {pass_count}/{rounds} — PASS/FAIL |

## Required Fixes (Union)
[Merge Required Fixes from all failing rounds. Deduplicate. Number sequentially.]

## Round Variance Analysis
[Note any criteria where scores differed across rounds — this indicates non-determinism or
borderline implementation quality that should be addressed even if the sprint overall passes.]
```

---

Update state: `"artifacts.evaluation"` → aggregate file path.

### 6H. Verdict Routing

**If AGGREGATE PASS:**
```
  [SPRINT {current_sprint}] RESULT: PASS [ok]  ({pass_count}/{total_evaluations} passed)
  Advancing to next sprint.
```
Update state: `"fail_count"` → 0, `"sprint_num"` → current_sprint + 1, `"phase"` → `"CONTRACTING"` (or `"DONE"`). Advance loop.

**If AGGREGATE FAIL:**
Increment `fail_count` by 1.
```
  [SPRINT {current_sprint}] RESULT: FAIL  [retry {fail_count} of {max_retries}]
  Consensus: {pass_count}/{total_evaluations} passed — needed {passes_needed}
```
If `fail_count >= max_retries` → trigger Section 9 (Escalation). Otherwise proceed to 6I.

### 6I. FIXING — Merge Feedback and Retry

Print:
```
------------------------------------------------------------
  PHASE: FIXING  [Sprint {current_sprint} — Attempt {fail_count + 1}]
------------------------------------------------------------
```

Update state: `"phase"` → `"FIXING"`.

Extract the "Required Fixes (Union)" section from `sprint_{current_sprint}_eval_aggregate.md`. Write it to `pge-workspace/sprint_{current_sprint}_feedback.md`. Update state: `"artifacts.feedback"` → feedback path.

Return to Step 6E for the same sprint.

---

## Step 7: DONE — Pipeline Complete

```
============================================================
  PGE ULTRA PIPELINE COMPLETE
============================================================
  All {total_sprints} sprints passed {consensus_mode} consensus.

  Evaluation config:
  - Evaluator(s): {evaluator_target}
  - Rounds per evaluator: {rounds}
  - Total evaluations/sprint: {total_evaluations}
  - Passes needed: {passes_needed}

  Sprint Results:
  ┌─────────┬──────────────────────────────────────────────┬───────────────────┐
  │ Sprint  │ Aggregate                                    │ Consensus         │
  ├─────────┼──────────────────────────────────────────────┼───────────────────┤
  │ Sprint 1│ sprint_1_eval_aggregate.md                   │ X/Y PASS          │
  │ ...     │ ...                                          │ ...               │
  └─────────┴──────────────────────────────────────────────┴───────────────────┘

  State: pge-workspace/pge_state.json
============================================================
```

Write `pge-workspace/pge_summary.md`:

```markdown
# PGE Ultra Pipeline Summary

## Product
{user_prompt}

## Evaluation Configuration
- Mode: ultra
- Evaluator(s): {evaluator_target}
- Consensus: {consensus_mode}
- Rounds per evaluator: {rounds}
- Total evaluations per sprint: {total_evaluations}
- Passes needed: {passes_needed}

## Sprints Completed
| Sprint | Aggregate Report | Consensus | Attempts |
|--------|-----------------|-----------|----------|
| 1 | sprint_1_eval_aggregate.md | X/{total_evaluations} PASS | 1 |
| ... | ... | ... | ... |

## Final State
All sprints: PASS (by {consensus_mode} consensus)
Completed at: [ISO timestamp]
```

---

## Section 8: Resume Logic

When `--resume` is passed:

1. Read `pge-workspace/pge_state.json`. Restore `{evaluator_target}`, `{consensus_mode}`, `{rounds}`, `{total_evaluations}`, `{passes_needed}` from state. Recompute `{active_evaluators}` from `evaluator_target`.

2. Print resume banner:
   ```
   ============================================================
     PGE ULTRA ORCHESTRATOR — RESUMING
     Phase:       {phase}
     Sprint:      {sprint_num} / {total_sprints}
     Evaluator:   {evaluator_target}
     Consensus:   {consensus_mode}  ({passes_needed}/{total_evaluations})
     Rounds:      {rounds}
     Fail count:  {fail_count}
     Checkpoint:  {last_checkpoint}
   ============================================================
   ```

3. Route by `"phase"`:
   - `"PLANNING"` → Step 5
   - `"CONTRACTING"` → Step 6B for current `sprint_num`
   - `"IMPLEMENTING"` → Step 6E for current `sprint_num`
   - `"EVALUATING"` → Step 6F for current `sprint_num` (re-run all active evaluators)
   - `"FIXING"` → Step 6I for current `sprint_num`
   - `"DONE"` → print "Pipeline already complete." and stop.

---

## Section 9: Escalation Protocol

Triggered when `fail_count >= max_retries`.

Update state: `"phase"` → `"ESCALATED"`.

```
============================================================
  PGE ULTRA ESCALATION — HUMAN INTERVENTION REQUIRED
============================================================
  Sprint {current_sprint} has failed {fail_count} times.
  Consensus: {pass_count}/{total_evaluations} PASS — needed {passes_needed}
  Max retries ({max_retries}) reached.

  Aggregate report: pge-workspace/sprint_{current_sprint}_eval_aggregate.md
  Feedback file:    pge-workspace/sprint_{current_sprint}_feedback.md

  Option 1 — Fix manually, then: pge-ultra --resume
  Option 2 — Relax consensus: pge-ultra "{prompt}" --mode majority --sprint {current_sprint}
  Option 3 — Reduce evaluator pool: pge-ultra "{prompt}" --evaluator standard --rounds 3 --sprint {current_sprint}
  Option 4 — Fall back to standard pipeline: pge "{prompt}" --sprint {current_sprint}
  Option 5 — Abort: delete pge-workspace/pge_state.json
============================================================
```

---

## Section 10: State Schema

```json
{
  "mode": "ultra",
  "evaluator_target": "all | standard | strict | quality",
  "consensus_mode": "majority | unanimous",
  "rounds": 1,
  "total_evaluations": 3,
  "passes_needed": 2,
  "phase": "PLANNING | CONTRACTING | IMPLEMENTING | EVALUATING | FIXING | DONE | ESCALATED",
  "sprint_num": 1,
  "total_sprints": 5,
  "fail_count": 0,
  "max_retries": 3,
  "last_checkpoint": "2026-04-16T10:00:00Z",
  "artifacts": {
    "spec": "pge-workspace/product_spec.md",
    "contract": "pge-workspace/sprint_1_contract_ratified.md",
    "evaluation": "pge-workspace/sprint_1_eval_aggregate.md",
    "feedback": "pge-workspace/sprint_1_feedback.md"
  },
  "contract_warnings": []
}
```

---

## Section 11: Evaluation File Naming Reference

### All-evaluator mode (`--evaluator all`)

| Scenario | File pattern |
|----------|-------------|
| Single round, standard | `sprint_N_eval_standard.md` |
| Single round, strict | `sprint_N_eval_strict.md` |
| Single round, quality | `sprint_N_eval_quality.md` |
| Multi-round, standard | `sprint_N_eval_standard_r1.md` … `_rR.md` |
| Multi-round, strict | `sprint_N_eval_strict_r1.md` … `_rR.md` |
| Multi-round, quality | `sprint_N_eval_quality_r1.md` … `_rR.md` |

### Single-evaluator mode (`--evaluator standard|strict|quality`)

| Scenario | File pattern |
|----------|-------------|
| Single round | `sprint_N_eval_{evaluator}.md` |
| Multi-round (R rounds) | `sprint_N_eval_{evaluator}_r1.md` … `sprint_N_eval_{evaluator}_rR.md` |

### Always present

| File | Description |
|------|-------------|
| `sprint_N_eval_aggregate.md` | Aggregated verdict and merged Required Fixes |
| `sprint_N_feedback.md` | Extracted Required Fixes written to generator (if FAIL) |

---

## Section 12: Critical Constraints

1. **Never reuse agent contexts.** Every Agent call is a fresh instance. Each (evaluator, round) pair is a separate spawn.
2. **Contract review always uses `evaluator-standard`.** The multi-evaluation gauntlet applies only to sprint implementation evaluation.
3. **Aggregate file is the source of truth for verdict.** Read verdicts from evaluation files, not from evaluator chat output.
4. **Only the Orchestrator writes `pge_state.json`.**
5. **Required Fixes must be merged and deduplicated.** The generator receives one unified feedback file, not multiple evaluator reports.
6. **Single-evaluator mode with `--rounds 1` is functionally identical to `pge --evaluator X`.** Recommend `--rounds 3` minimum for meaningful repetition benefit.

---

## Section 13: Console Output Standards

- Major transitions: `=` characters, 60 wide
- Sub-phase: `-` characters, 60 wide
- Per-evaluation result: `  [standard] → PASS` / `  [strict, round 2] → FAIL`
- Aggregate verdict (all-eval): `  [SPRINT N] RESULT: PASS [ok]  (X/Y evaluators passed)`
- Aggregate verdict (single-eval): `  [SPRINT N] RESULT: PASS [ok]  (X/Y rounds passed)`
- FAIL: `  [SPRINT N] RESULT: FAIL  [retry N of M]  Consensus: X/Y — needed Y'`
