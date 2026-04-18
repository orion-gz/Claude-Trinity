# PGE Orchestrator

**Autonomous Planner → Generator → Evaluator build pipeline for Claude Code.**

One sentence prompt. Full product. No manual intervention.

## Table of Contents

- [What is PGE?](#what-is-pge)
- [Quick Start](#quick-start)
- [Pipeline Modes](#pipeline-modes)
  - [pge — Standard](#pge--standard-pipeline)
  - [pge-strict — Strict](#pge-strict--strict-pipeline)
  - [pge-quality — Quality](#pge-quality--quality-pipeline)
  - [pge-ultra — Ultra Consensus](#pge-ultra--ultra-consensus-pipeline)
  - [pge-orchestrator — Adaptive](#pge-orchestrator--adaptive-pipeline-agent)
  - [pge-idontcaretokenanymore — Unlimited](#pge-idontcaretokenanymore--premium-unlimited-pipeline)
  - [pge-god — God Mode](#pge-god--god-mode)
- [Pipeline Diagram](#pipeline-diagram)
- [Evaluation Criteria](#evaluation-criteria)
- [pge-workspace/ Layout](#pge-workspace-layout)
- [Escalation](#escalation)
- [Resuming an Interrupted Session](#resuming-an-interrupted-session)
- [Terminal Tools](#terminal-tools)
- [Design Principles](#design-principles)
- [Changelog](#changelog)

---

## What is PGE?

PGE is a Claude Code plugin that turns a single prompt into a complete, tested product. It coordinates three specialist agents across multiple sprints — a **Planner** that writes a product spec, a **Generator** that implements each sprint, and an **Evaluator** that tests the running application via Playwright. Sprints that fail evaluation are automatically retried with extracted feedback until they pass or escalate to you.

Every agent runs in a **fully isolated subprocess**. Communication happens through files only — no shared context, no hallucination bleed-through between roles.

---

## Quick Start

**Step 1: Install**

These are Claude Code slash commands — enter them **one at a time** (pasting both lines at once will fail):

```
/plugin marketplace add https://github.com/orion-gz/Claude-Trinity
```

Then:

```
/plugin install pge-orchestrator
```

Restart Claude Code. All 16 skills and 10 agents are installed automatically.

> **Alternative (manual install)**
> ```bash
> git clone https://github.com/orion-gz/Claude-Trinity.git
> cd Claude-Trinity
> bash install.sh
> ```

**Step 2: Add Playwright MCP**

The Evaluator uses Playwright for live browser testing. If you don't have it yet:

```
/mcp-setup
```

Select Playwright from the list, or add it manually to your MCP config:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

**Step 3: Build something**

```
/pge "build a habit tracker with streaks and reminders"
```

PGE writes a full product spec, implements sprint by sprint, and tests each sprint in a real browser. Failing sprints are retried automatically with extracted feedback — no manual intervention needed.

### Pick a mode

| What you need | Command |
|---------------|---------|
| Fast prototype | `/pge` |
| Production-safe (FAIL-biased evaluator) | `/pge-strict` |
| Client-facing quality (≥ 4/5 threshold) | `/pge-quality` |
| All 3 evaluators must agree | `/pge-ultra` |
| Token cost irrelevant, max quality | `/pge-idontcaretokenanymore` |
| Absolute ceiling (godmode × 10 rounds) | `/pge-god` |

Not sure which to pick? Use `/pge-orchestrator` — it analyzes your prompt and assigns the right evaluator per sprint automatically.

### Switch the evaluator backend

By default, the Evaluator runs as a Claude agent with full Playwright browser testing. You can switch to **Codex** or **Gemini CLI** for static code-review evaluation:

```
/pge-eval-backend codex    # use Codex CLI (no Playwright — static analysis only)
/pge-eval-backend gemini   # use Gemini CLI (no Playwright — static analysis only)
/pge-eval-backend claude   # restore full Playwright evaluation (default)
```

Or as a one-time flag:
```
/pge "build a habit tracker" --eval-backend codex
```

---

## Pipeline Modes

Five modes are available. Choose based on the complexity and quality bar of your project.

| Mode | Command | Evaluator | Pass threshold | Best for |
|------|---------|-----------|----------------|----------|
| **Standard** | `pge` | `evaluator-standard` | ≥ 3/5 all criteria | Prototypes, internal tools |
| **Strict** | `pge-strict` | `evaluator-strict` | ≥ 3/5, FAIL-biased | Production code, APIs |
| **Quality** | `pge-quality` | `evaluator-quality` | ≥ 4/5 all criteria | Client-facing products |
| **Ultra** | `pge-ultra` | All 3 evaluators, consensus | Majority (or unanimous) | High-stakes builds |
| **Adaptive** | `pge-orchestrator` | Auto-selected per sprint | Varies per sprint | When you're not sure |
| **idontcaretokenanymore** | `pge-idontcaretokenanymore` | `evaluator-quality` × 5, unanimous | 5/5 rounds, ≥ 4/5 each | Token cost irrelevant, max quality |
| **God** | `pge-god` | `evaluator-godmode` × 10, unanimous | 10/10 rounds, ≥ 4.5/5 each | Absolute perfection |

---

## Examples

```bash
# Simplest — standard evaluator
pge "build a habit tracker with streaks and reminders"

# Higher quality bar
pge-quality "build a SaaS invoice generator with PDF export"

# Maximum rigor — all 3 evaluators must agree
pge-ultra "build a multi-tenant auth system with RBAC"

# Let the pipeline decide (recommended when unsure)
pge-orchestrator "build a real-time collaborative whiteboard"

# Token cost is irrelevant — quality × 5 unanimous rounds
pge-idontcaretokenanymore "build a customer-facing analytics dashboard"

# Absolute ceiling — godmode × 10 unanimous rounds, ≥ 4.5/5
pge-god "build a production-grade payment processing system"
```

---

## `pge` — Standard Pipeline

The baseline mode. A single `evaluator-standard` grades each sprint. Pass threshold is ≥ 3/5 on all four criteria.

### Syntax

```
pge "prompt"
pge "prompt" --evaluator [standard|strict|quality]
pge "prompt" --eval-backend [claude|codex|gemini]
pge "prompt" --dry-run
pge "prompt" --sprint N
pge --resume
```

### Flags

| Flag | Description |
|------|-------------|
| _(none)_ | Start a new pipeline with standard evaluator |
| `--evaluator strict` | Use strict (FAIL-biased) evaluator |
| `--evaluator quality` | Use quality evaluator (≥ 4/5 threshold) |
| `--eval-backend codex` | Use Codex CLI evaluator for this run (not persisted) |
| `--eval-backend gemini` | Use Gemini CLI evaluator for this run (not persisted) |
| `--dry-run` | Run planning + contract negotiation only, skip implementation |
| `--sprint N` | Begin at sprint N after planning |
| `--resume` | Continue an interrupted session from last checkpoint |

### Examples

```bash
pge "build a Pomodoro timer with session history"
pge "build a REST API for a book library" --evaluator strict
pge "build a kanban board" --dry-run          # inspect the plan before building
pge --resume                                   # continue after a crash
```

---

## `pge-strict` — Strict Pipeline

Shortcut for `pge "..." --evaluator strict`. Uses `evaluator-strict` which starts every criterion at 2/5 (FAIL) and requires evidence to move up. Edge cases are mandatory, not optional.

```bash
pge-strict "build a payment processing module"
pge-strict "build a JWT authentication service"
```

---

## `pge-quality` — Quality Pipeline

Shortcut for `pge "..." --evaluator quality`. Requires ≥ 4/5 on all criteria. Includes mandatory code review, performance observation, and visual audit passes.

```bash
pge-quality "build a customer-facing dashboard with charts"
pge-quality "build a multi-step onboarding flow"
```

---

## `pge-ultra` — Ultra Consensus Pipeline

Runs multiple evaluators per sprint. A sprint only passes when the configured consensus threshold is met. Two strategies:

- **All-evaluator mode** (default): `standard` + `strict` + `quality` each run once (or N rounds each)
- **Single-evaluator repeated mode**: one evaluator runs N rounds, majority of rounds decides

### Syntax

```
pge-ultra "prompt"
pge-ultra "prompt" --mode [majority|unanimous]
pge-ultra "prompt" --rounds N
pge-ultra "prompt" --evaluator [standard|strict|quality] --rounds N
pge-ultra "prompt" --dry-run
pge-ultra --resume
```

### Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--evaluator` | `all`, `standard`, `strict`, `quality` | `all` | Which evaluator(s) to use |
| `--mode` | `majority`, `unanimous` | `majority` | Consensus threshold |
| `--rounds` | integer ≥ 1 | `1` | How many times each evaluator runs per sprint |
| `--dry-run` | — | off | Plan + contracts only |
| `--sprint N` | integer | `1` | Start at sprint N |
| `--resume` | — | — | Resume from checkpoint |

### Examples

```bash
# All 3 evaluators, majority wins (2/3 must pass)
pge-ultra "build a fintech dashboard"

# All 3 must agree — maximum consensus
pge-ultra "build an e-commerce checkout" --mode unanimous

# Strict evaluator × 3 rounds — majority of rounds must pass
pge-ultra "build a real-time chat" --evaluator strict --rounds 3

# Quality evaluator × 5 rounds — all 5 must pass
pge-ultra "build a medical records viewer" --evaluator quality --rounds 5 --mode unanimous
```

### Ultra evaluation file layout

```
pge-workspace/
├── sprint_1_eval_standard.md         # Standard evaluator result
├── sprint_1_eval_strict.md           # Strict evaluator result
├── sprint_1_eval_quality.md          # Quality evaluator result
├── sprint_1_eval_aggregate.md        # Consensus verdict + merged Required Fixes
└── sprint_1_feedback.md              # Unified feedback written to Generator
```

---

## `pge-orchestrator` — Adaptive Pipeline (Agent)

The most intelligent mode. Analyzes your prompt, selects a base evaluation strategy automatically, reads the Planner's complexity assessment, assigns a different evaluator per sprint based on risk, and escalates evaluator strictness dynamically when sprints fail repeatedly.

Unlike the other modes (which are **skills** running in your current conversation), `pge-orchestrator` is a **standalone agent** — it runs in a fully isolated subprocess and can also be invoked programmatically by other agents.

### Syntax

```
pge-orchestrator "prompt"
pge-orchestrator "prompt" --mode [auto|standard|quality|strict|ultra]
pge-orchestrator "prompt" --dry-run
pge-orchestrator "prompt" --sprint N
pge-orchestrator --resume
```

### Automatic complexity analysis

When `--mode auto` (default), the orchestrator scores your prompt across 5 dimensions:

| Dimension | 0 | 1 | 2 |
|-----------|---|---|---|
| Scope | Single feature | 2–3 features | Full product / multi-role |
| Data sensitivity | No user data | Basic accounts | Auth, payments, PII |
| Integration complexity | None | Internal only | External APIs / real-time |
| UI complexity | Static display | Interactive CRUD | Complex state / animations |
| Domain risk | Toy / demo | Standard app | Finance, health, enterprise |

Score → tier → base evaluator mode:

| Score | Tier | Base mode |
|-------|------|-----------|
| 0–3 | Simple | `standard` |
| 4–6 | Standard | `quality` |
| 7–8 | Complex | `strict` |
| 9–10 | Critical | `ultra` |

### Per-sprint evaluator assignment

The Planner writes a **Complexity Assessment** and **Evaluator Recommendation** section into `product_spec.md`. The orchestrator reads these signals and builds a per-sprint mode map:

```
[PLAN] Per-sprint evaluator assignment:
  Sprint 1: standard   [low risk]
  Sprint 2: quality    [medium risk]
  Sprint 3: strict     [HIGH RISK: auth, payments]
  Sprint 4: quality    [medium risk]
```

### Adaptive retry escalation

When a sprint fails, the orchestrator escalates the evaluator on each retry:

| Failure count | Retry evaluator | Rationale |
|---------------|-----------------|-----------|
| 1st fail | Same mode | Give the Generator another chance |
| 2nd fail | One tier stricter | Catch what the first evaluator missed |
| 3rd fail | `ultra` | Maximum scrutiny before human escalation |

### Invoking as a subagent

`pge-orchestrator` can be called from other agents (e.g., OMC autopilot, ralph, team pipelines):

```
subagent_type: "pge-orchestrator"
prompt: |
  USER_PROMPT: build a SaaS analytics dashboard
  MODE_HINT: auto
  START_SPRINT: 1
  DRY_RUN: false
  EVAL_BACKEND: codex
```

---

## `pge-idontcaretokenanymore` — Premium Unlimited Pipeline

Token cost is irrelevant. Quality is the only priority. `evaluator-quality` runs 5 independent rounds per sprint — all 5 must pass unanimously (≥ 4/5 on all criteria). Up to 5 retries per sprint.

```bash
pge-idontcaretokenanymore "build a customer analytics dashboard"
pge-idontcaretokenanymore "build a multi-step onboarding flow" --dry-run
pge-idontcaretokenanymore --resume
```

**Per-sprint cost:** 5 isolated Evaluator runs + up to 5 Generator retries. Each round is a fully independent Playwright session — no shared context.

**Aggregate report per sprint** (`sprint_N_eval_aggregate.md`):
- Round-by-round verdicts (R1–R5)
- Merged Required Fixes from all failing rounds
- Round Variance Analysis — flags criteria with inconsistent scores across rounds

---

## `pge-god` — God Mode

The absolute ceiling. Uses `evaluator-godmode` — a new evaluator with **half-point scoring (0–5 in 0.5 increments)** and a **≥ 4.5/5 pass threshold** on all four criteria. Runs 10 unanimous rounds per sprint. Up to 10 retries.

```bash
pge-god "build a production-grade payment processing system"
pge-god "build a HIPAA-compliant patient records viewer"
pge-god --resume
```

### `evaluator-godmode` — What makes it different

| | `evaluator-quality` | `evaluator-godmode` |
|--|--|--|
| Scoring | Integer (1–5) | Half-point (1.0–5.0) |
| Pass threshold | ≥ 4/5 | ≥ 4.5/5 |
| Edge cases | Recommended | **Mandatory battery** |
| Code review | Yes | **Deep review — reads source files** |
| Performance | Noted | **Flagged if > 2s load / > 100ms interaction** |
| Visual audit | Yes | **Pixel-level + responsive breakpoints** |
| Path to 5.0 | No | **Required for every non-5.0 criterion** |

### Mandatory testing protocol (every round)
1. Core flow exhaustion — all branches including failure paths
2. Edge case battery — empty states, boundaries, rapid actions, session persistence, concurrent ops
3. Error handling audit — every error state must show a user-facing message
4. Visual perfection audit — responsive, loading states, hover/focus/active states
5. Performance observation — load time, interaction lag, memory leaks
6. Code quality deep review — reads implementation files directly

### God Mode aggregate report
Each sprint produces a `sprint_N_eval_aggregate.md` with:
- 10-round score table (all four criteria per round)
- Score Distribution Analysis — min/max/avg per criterion, variance flagging
- Required Fixes (Union) across all failing rounds
- **Path to 10/10** — improvement roadmap even on passing sprints

---

## Pipeline Diagram

```
User Prompt
    │
    ▼
┌─────────────────────────────────┐
│  PLANNING                       │
│  Planner → product_spec.md      │
│  (+ Complexity Assessment       │
│   + Evaluator Recommendation)   │
└────────────────┬────────────────┘
                 │
    ┌────────────▼────────────────────────────────────────┐
    │  SPRINT LOOP  (repeats for each sprint)             │
    │                                                     │
    │  CONTRACTING                                        │
    │  Generator → sprint_N_contract.md                  │
    │  Evaluator → sprint_N_contract_ratified.md          │
    │        │                                            │
    │        ▼                                            │
    │  IMPLEMENTING                                       │
    │  Generator → code + git commit                      │
    │           → sprint_N_handoff.md                    │
    │        │                                            │
    │        ▼                                            │
    │  EVALUATING  (Playwright browser testing)           │
    │  Evaluator → sprint_N_evaluation.md                 │
    │        │                                            │
    │      PASS ──────────────────────► next sprint ──────┘
    │      FAIL                                           │
    │        │                                            │
    │        ▼                                            │
    │  FIXING                                             │
    │  Extract Required Fixes → sprint_N_feedback.md      │
    │  [adaptive: escalate evaluator mode]                │
    │  Retry → IMPLEMENTING (max 3 attempts)              │
    │        │                                            │
    │   3 fails → ESCALATE to user                        │
    └─────────────────────────────────────────────────────┘
                 │
                 ▼
           DONE — pge_summary.md
```

---

## Evaluation Criteria

All evaluators grade on the same four criteria. Pass thresholds differ by mode.

| Criterion | What it measures |
|-----------|-----------------|
| **Functionality** | All specified user flows work end-to-end |
| **Product Depth** | Interactions produce real, meaningful outcomes — not cosmetic |
| **Visual Design** | UI matches the spec's visual language; no placeholder or lorem ipsum UI |
| **Code Quality** | No stubs, no critical errors, no unhandled exceptions in hot paths |

### Pass thresholds by evaluator

| Evaluator | Threshold | Notes |
|-----------|-----------|-------|
| `evaluator-standard` | ≥ 3/5 on all four | Default |
| `evaluator-strict` | ≥ 3/5, FAIL-biased | Starts at 2/5. Requires evidence to score up. Edge cases mandatory. |
| `evaluator-quality` | ≥ 4/5 on all four | Includes code review, performance, visual audit passes |

---

## `pge-workspace/` Layout

All pipeline artifacts are written to `pge-workspace/` in your working directory. Application code is committed to your working directory by the Generator.

```
pge-workspace/
├── pge_state.json                        # Pipeline state (Orchestrator only)
├── pge_summary.md                        # Final report (written on DONE)
├── product_spec.md                       # Full product specification (Planner)
│
├── sprint_1_contract.md                  # Contract proposal (Generator)
├── sprint_1_contract_ratified.md         # Ratified contract (Evaluator)
├── sprint_1_handoff.md                   # Implementation summary + startup commands
├── sprint_1_evaluation.md                # Playwright test results + scores
├── sprint_1_feedback.md                  # Required fixes (written on FAIL)
│
├── sprint_2_contract.md
├── sprint_2_contract_ratified.md
│   ...
│
# pge-ultra only:
├── sprint_1_eval_standard.md
├── sprint_1_eval_strict.md
├── sprint_1_eval_quality.md
├── sprint_1_eval_aggregate.md            # Consensus verdict + merged Required Fixes
│
# pge-limit (usage guard):
├── .pause-signal                         # Written by guard when threshold is reached
└── pge_checkpoint.md                     # Compact resume context (written on PAUSED)
```

### `pge_state.json` fields

```json
{
  "mode": "standard | strict | quality | ultra | orchestrator",
  "phase": "PLANNING | CONTRACTING | IMPLEMENTING | EVALUATING | FIXING | DONE | ESCALATED | PAUSED",
  "eval_backend": "claude | codex | gemini",
  "sprint_num": 2,
  "total_sprints": 5,
  "fail_count": 1,
  "max_retries": 3,
  "sprint_modes": { "1": "standard", "2": "quality", "3": "strict" },
  "sprint_results": { "1": "PASS" },
  "last_checkpoint": "2026-04-16T10:00:00Z"
}
```

---

## Escalation

If a sprint fails `max_retries` (default: 3) times, the pipeline halts and presents options:

```
============================================================
  PGE ESCALATION — HUMAN INTERVENTION REQUIRED
============================================================
  Sprint 3 has failed 3 times.
  Last evaluation: pge-workspace/sprint_3_evaluation.md
  Last feedback:   pge-workspace/sprint_3_feedback.md

  Option 1 — Fix manually, then: pge --resume
  Option 2 — Revise the contract, delete sprint_3_contract_ratified.md, then: pge --resume
  Option 3 — Skip sprint: pge --sprint 4
  Option 4 — Abort: delete pge-workspace/pge_state.json
============================================================
```

---

## Resuming an Interrupted Session

Any mode supports `--resume`. It reads `pge_state.json`, restores all configuration, and picks up from the last recorded phase. File existence takes priority over state — if `sprint_2_handoff.md` exists but the state says `IMPLEMENTING`, the orchestrator skips to `EVALUATING`.

```bash
pge --resume
pge-ultra --resume
pge-orchestrator --resume
```

---

## Terminal Tools

Nine slash commands for monitoring and managing pipelines directly from Claude Code, plus raw Node.js scripts for use in a separate terminal pane.

### `/pge-update` — Update from inside Claude Code

Updates PGE to the latest version without leaving Claude Code. Runs git pull + reinstalls all skills and agents.

```
/pge-update
```

### `/pge-autolaunch` — Auto-launch toggle

Enables or disables automatic terminal indicator launch when `/pge` is invoked. When enabled, a new Terminal window opens automatically with the live agent indicator.

```
/pge-autolaunch        # enable (default)
/pge-autolaunch on     # enable
/pge-autolaunch off    # disable
/pge-autolaunch status # show current state
```

Auto-launch opens the indicator terminal and starts the macOS notification watcher automatically — no manual `node bridge/pge-indicator.cjs` needed.

### `/pge-statusline` — Claude Code status bar integration

Enables or disables the PGE state display in the Claude Code status bar.

```
/pge-statusline        # enable (default)
/pge-statusline on     # enable
/pge-statusline off    # disable
/pge-statusline status # show current state
```

While a pipeline is active, the status bar shows:

```
⚙️  PGE quality · sprint 2/5 · evaluator-quality
```

Silent (empty output) when no pipeline is running.

### `/pge-preflight` — Pre-flight check

Verifies all dependencies before starting a pipeline. Catches missing Playwright MCP, uninitialized git repo, and missing agents/skills before they cause a mid-sprint failure.

```
/pge-preflight
```

```
PGE Pre-flight Check

  ✓  Claude Code found
  ✓  Node.js v22.x
  ✓  Git found
  ✓  Working directory is a git repository
  ✗  Playwright MCP not found
     → Add to MCP config: npx @playwright/mcp@latest
  ✓  PGE agents installed  (planner, generator, evaluator)
  ✓  PGE skills installed  (/pge, /pge-strict, /pge-quality ...)
```

### `/pge-clean` — Workspace cleanup

Deletes `pge-workspace/` in the current project to start fresh.

```
/pge-clean
```

### `/pge-summary` — Sprint results summary

Pretty-prints the pipeline results — sprint-by-sprint pass/fail, evaluator used, scores, and the full `pge_summary.md` report.

```
/pge-summary
```

### `/pge-indicator` — Live agent indicator

Opens a new Terminal window with the live agent indicator for the current project.

```
/pge-indicator
```

```
┌─────────────────────────────────────────────────────┐
│ PGE Orchestrator   quality                          │
├─────────────────────────────────────────────────────┤
│ Sprint   2 / 5  ████░░░░░░░░░░░░░░░░░░  20%        │
│ Phase    Evaluating                                 │
│ Agent    ● evaluator-quality  (sprint 2)            │
│ Retries  1 / 3                                      │
│ Updated  10:42:05 AM                                │
└─────────────────────────────────────────────────────┘
  watching pge-workspace/pge_state.json  ·  ctrl+c to exit
```

### `/pge-eval-backend` — Switch evaluator backend

Select which AI backend runs the evaluation phase. Persists per-project or globally.

```
/pge-eval-backend                          → show current backend and config paths
/pge-eval-backend claude                   → full Playwright evaluation  [default]
/pge-eval-backend codex                    → Codex CLI via tmux (static code review)
/pge-eval-backend gemini                   → Gemini CLI via tmux (static code review)
/pge-eval-backend codex --global           → set global default
/pge-eval-backend --clear                  → remove project-level override
```

**Backend comparison:**

| Backend | Testing method | Playwright | Pass threshold |
|---------|---------------|-----------|----------------|
| `claude` (default) | Interactive browser + code review | ✅ Full | Per-mode |
| `codex` | Static code analysis via Codex CLI | ❌ None | Per-mode |
| `gemini` | Static code analysis via Gemini CLI | ❌ None | Per-mode |

Requires: `tmux` + `codex` or `gemini` CLI in PATH for external backends.

Config is stored at `pge-workspace/.eval-backend` (project) or `~/.claude/pge-eval-backend` (global).

### `/pge-notify` — macOS notifications

Starts a background notification watcher that fires a system notification when a sprint passes, fails, or the pipeline finishes.

```
/pge-notify
```

Fires on: **sprint pass**, **sprint fail / retry**, **pipeline done**, **escalation** (human intervention needed).

### `/pge-limit` — Usage-based auto-pause

Set a token usage threshold. When Claude Code usage reaches the specified percentage of the 5-hour or weekly limit, PGE saves a compact checkpoint and stops gracefully at the next phase boundary. Resume after your limit resets with `pge --resume` — no extra context re-read overhead.

```
/pge-limit <percentage>                   # pause at N% of 5h limit (auto-detect max)
/pge-limit <percentage> --type weekly     # weekly window
/pge-limit <percentage> --max <tokens>    # explicit token ceiling (e.g. --max 45000000)
/pge-limit off                            # disable
/pge-limit status                         # show current config
```

**Examples:**
```
/pge-limit 80                             # stop at 80% of 5h token limit
/pge-limit 75 --type weekly               # stop at 75% of weekly limit
/pge-limit 80 --max 45000000             # explicit 45M token ceiling, stop at 80%
```

**What happens when the threshold is reached:**

1. Background guard (`pge-usage-guard.cjs`) detects usage ≥ threshold
2. Writes `pge-workspace/.pause-signal`
3. Orchestrator picks it up at the next phase boundary (never mid-execution)
4. Compact checkpoint saved to `pge-workspace/pge_checkpoint.md`
5. State written as `PAUSED` in `pge_state.json`
6. macOS notification fires
7. Resume after limit resets: `pge --resume`

If `--max` is omitted, the guard falls back to `ccusage` (if installed) to determine usage percentage. Install with: `npm i -g ccusage`

---

### Running tools directly from a terminal

All tools are also available as Node.js scripts in `bridge/`:

```bash
node bridge/pge-indicator.cjs [/path/to/project]
node bridge/pge-notify.cjs    [/path/to/project]
node bridge/pge-summary.cjs   [/path/to/project]
node bridge/pge-preflight.cjs
node bridge/pge-clean.cjs [--force]
node bridge/pge-statusline.cjs   # outputs status bar line to stdout
```

---

## Design Principles

**File-based IPC only.**
Agents communicate exclusively through files in `pge-workspace/`. No shared conversational context. Each agent invocation is a fully isolated subprocess.

**Producer-judge separation.**
The Generator and Evaluator for the same sprint are always separate Agent calls — never the same instance. This prevents the Evaluator from rationalizing Generator mistakes.

**State is ground truth.**
Phase files on disk override `pge_state.json`. The pipeline is resilient to crashes, partial writes, and mid-sprint interruptions.

**Adaptive escalation never de-escalates.**
Within a sprint's retries, evaluator strictness can only increase. Once `fail_count` rises, the retry evaluator moves toward stricter — never back.

**Only the Orchestrator writes `pge_state.json`.**
Subagents (Planner, Generator, Evaluator) write only their designated output files. State management is centralized.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

| Version | Summary |
|---------|---------|
| **2.7.0** | Added `/pge-limit` — usage-based auto-pause with compact checkpoint/resume; background `pge-usage-guard.cjs` monitors token usage and signals pipeline to stop gracefully at the next phase boundary; new `PAUSED` state with `pge --resume` support |
| **2.6.0** | Added evaluator backend selection (`/pge-eval-backend`) — run evaluation via Codex or Gemini CLI using tmux; added `evaluator-codex` and `evaluator-gemini` agents; `--eval-backend` flag for all pipeline modes |
| **2.5.0** | Added 8 slash commands (`/pge-statusline`, `/pge-preflight`, `/pge-clean`, `/pge-summary`, `/pge-indicator`, `/pge-notify`, `/pge-update`, `/pge-autolaunch`), MCP server with 11 tools, status bar integration, auto-launch hook |
| **2.2.0** | Added `pge-orchestrator` adaptive agent with complexity analysis, per-sprint evaluator assignment, and retry escalation |
| **2.1.0** | Renamed evaluator variants (`evaluator-standard/strict/quality`), added single-evaluator repeated mode in `pge-ultra` |
| **2.0.0** | Added `pge-strict`, `pge-quality`, `pge-ultra` modes |
| **1.0.0** | Initial release — core PGE pipeline |
