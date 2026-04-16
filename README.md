# PGE Orchestrator

PGE (Planner-Generator-Evaluator) is a Claude Code plugin that runs a fully autonomous, multi-sprint product build pipeline. You provide a one-sentence prompt; the pipeline handles planning, implementation, and quality evaluation end-to-end — cycling through sprints until the product is complete or escalating to you when it needs help.

---

## Requirements

- Claude Code with the following agents installed in `~/.claude/agents/`:
  - `planner.md`
  - `generator.md`
  - `evaluator.md`
- The evaluator agent requires the Playwright MCP for live interaction testing.

---

## Installation

```bash
bash install.sh
```

The installer:
1. Copies `src/skills/pge.md` to `~/.claude/skills/pge.md`
2. Appends the `## PGE Mode` adapter section to each of the three agent files (idempotent — skips if already present)

---

## Quick Start

```bash
pge "build me a task manager with AI-powered prioritization"
```

---

## All Flags

| Flag | Description | Example |
|------|-------------|---------|
| _(none)_ | Start a new pipeline | `pge "build a habit tracker"` |
| `--dry-run` | Plan and contract all sprints without implementing | `pge "build a habit tracker" --dry-run` |
| `--resume` | Resume an interrupted pipeline from last checkpoint | `pge --resume` |
| `--sprint N` | Start from sprint N (runs planner if no spec exists) | `pge "build a habit tracker" --sprint 2` |

---

## pge-workspace/ Layout

All pipeline artifacts are written to `pge-workspace/` in your current working directory:

```
pge-workspace/
├── pge_state.json                      — Pipeline state (Orchestrator only)
├── pge_summary.md                      — Final report (written on DONE)
├── product_spec.md                     — Full product specification (Planner)
├── sprint_1_contract.md                — Contract proposal (Generator)
├── sprint_1_contract_ratified.md       — Ratified contract (Evaluator)
├── sprint_1_handoff.md                 — Implementation summary + startup commands (Generator)
├── sprint_1_evaluation.md              — Playwright test results + scores (Evaluator)
├── sprint_1_feedback.md                — Required fixes extracted from evaluation (Orchestrator)
├── sprint_2_contract.md
├── sprint_2_contract_ratified.md
│   ...
```

Application code is committed to your working directory by the Generator agent using git.

---

## Pipeline Diagram

```
User Prompt
    │
    ▼
[Planner] ──────────────────────► pge-workspace/product_spec.md
    │
    ▼
SPRINT LOOP ─────────────────────────────────────────────┐
│                                                         │
│  [Generator] ──► sprint_N_contract.md                  │
│  [Evaluator] ──► sprint_N_contract_ratified.md         │
│  [Generator] ──► implements code + git commit          │
│  [Evaluator] ──► sprint_N_evaluation.md                │
│      │                                                  │
│    PASS ──────────────────────────────────► next sprint ┘
│    FAIL ──► sprint_N_feedback.md ──► retry (max 3)
│                  │
│              3 failures ──► escalate to user
│
▼
DONE — pge-workspace/pge_summary.md
```

---

## Evaluation Criteria

Each sprint is graded on four independent criteria. All four must score >= 3/5 to pass:

| Criterion | What it measures | Pass threshold |
|-----------|-----------------|----------------|
| Functionality | All specified flows work end-to-end | 3/5 |
| Product Depth | Interactions produce real, meaningful outcomes (not cosmetic) | 3/5 |
| Visual Design | UI matches the spec's visual language; no placeholder UI | 3/5 |
| Code Quality | No stubs, no critical errors, no unhandled exceptions | 3/5 |

A single criterion below 3 fails the entire sprint and triggers a retry.

---

## Escalation

If a sprint fails 3 times in a row, the pipeline halts and presents your options:

1. Review the evaluation and feedback files, fix manually, then `pge --resume`
2. Revise the sprint contract, delete `sprint_N_contract_ratified.md`, then `pge --resume`
3. Skip the sprint: `pge --sprint N+1`
4. Abort: delete `pge-workspace/pge_state.json`

---

## Uninstallation

```bash
bash uninstall.sh
```

Removes `~/.claude/skills/pge.md` and strips the `## PGE Mode` section from each agent file.

---

## Design Principles

- **File-based IPC only.** Agents communicate exclusively through files in `pge-workspace/`. No shared conversational context between agents — each invocation is a fully isolated instance.
- **Producer-judge separation.** Generator and Evaluator are always fresh, isolated instances. The same context is never reused across both roles in the same sprint, preventing rationalization of failures.
- **State is ground truth.** If a phase file exists on disk, the phase is complete — regardless of what `pge_state.json` says. On resume, file existence takes priority over recorded state, making the pipeline resilient to crashes and partial writes.
