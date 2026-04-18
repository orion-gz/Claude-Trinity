# Changelog

## [2.7.0] — 2026-04-18

### Added — `/pge-limit` usage-based auto-pause

- New skill `/pge-limit <percentage>` — set a token usage threshold against the 5h or weekly Claude Code limit
- New bridge script `pge-usage-guard.cjs` — background monitor that polls usage every 60s and writes a `.pause-signal` to `pge-workspace/` when the threshold is crossed
  - Reads token counts from `~/.claude/projects/**/*.jsonl` directly (no external dependency)
  - Falls back to `ccusage` CLI if `--max` is not specified
- Orchestrator detects `.pause-signal` at each phase boundary (never mid-execution) and executes a graceful pause:
  - Writes compact `pge-workspace/pge_checkpoint.md` (sprint state, completed work, resume instructions)
  - Updates `pge_state.json` to `PAUSED` phase with `paused_before_phase` field
  - Fires macOS notification
- `pge --resume` handles `PAUSED` state — reads only `pge_state.json` + `pge_checkpoint.md` to restore context (no full spec re-read, minimal token overhead)
- Three new MCP tools: `pge_set_limit`, `pge_clear_limit`, `pge_limit_status`
- Status bar shows `⏸ PGE PAUSED` when pipeline is in PAUSED state
- Indicator TUI shows dedicated PAUSED screen with usage reason and resume command

### Changed — TUI overhaul (`pge-indicator.cjs`)

- Rounded box corners (`╭╮╰╯`) replacing square corners
- Double-line section divider (`╞═══╡`) separating header from content
- Mode badge right-aligned in header; usage guard active shown as `⛨` icon
- Sprint history dots row: `✓1  ▸2  ○3` (pass / current / pending)
- Relative timestamps: `42s ago` instead of absolute clock time
- Spinner (`◐◓◑◒`) animates on all active phases
- Dedicated screens per state: DONE (sprint ✓ list), PAUSED (usage reason + resume), ESCALATED (retry count + recovery hints), Idle

---

## [2.6.0] — 2026-04-17

### Added — Evaluator backend selection (`/pge-eval-backend`)

- New skill `/pge-eval-backend [claude|codex|gemini]` — switch the evaluation engine per project or globally
- New agents `evaluator-codex` and `evaluator-gemini` — static code review via Codex CLI or Gemini CLI through tmux (no Playwright required)
- `--eval-backend [claude|codex|gemini]` one-time flag on all pipeline modes
- Config stored at `pge-workspace/.eval-backend` (project) or `~/.claude/pge-eval-backend` (global)
- New bridge script `pge-eval-backend.cjs` — CLI tool for reading/writing backend config
- New MCP tool `pge_eval_backend` — get or set backend from inside Claude Code

| Backend | Method | Playwright |
|---------|--------|-----------|
| `claude` (default) | Interactive browser + code review | ✅ |
| `codex` | Static analysis via Codex CLI + tmux | ❌ |
| `gemini` | Static analysis via Gemini CLI + tmux | ❌ |

---

## [2.5.0] — 2026-04-17

### Added — Terminal tools suite & MCP server

#### Nine slash commands
- `/pge-update` — `git pull` + reinstall all skills and agents without leaving Claude Code
- `/pge-autolaunch [on|off|status]` — toggle auto-launch of the indicator terminal on `/pge` invocation
- `/pge-statusline [on|off|status]` — add/remove PGE state from the Claude Code status bar
- `/pge-preflight` — verify Playwright MCP, git, agents, and skills before starting a pipeline
- `/pge-clean [--force]` — delete `pge-workspace/` to start fresh
- `/pge-summary` — pretty-print sprint-by-sprint pass/fail results
- `/pge-indicator` — open live agent TUI in a new Terminal window
- `/pge-notify` — start background macOS notification watcher
- `/pge-eval-backend` — switch evaluator backend (see v2.6.0)

#### MCP server (`bridge/mcp-server.cjs`)
- Installs all skills to `~/.claude/commands/` and agents to `~/.claude/agents/` on first connect
- 11 MCP tools exposed to Claude Code for programmatic pipeline control
- Auto-generates `~/.claude/hooks/pge-autolaunch.sh` with `PLUGIN_ROOT` baked in

#### Status bar integration
- `pge-statusline.cjs` outputs a compact one-liner: `⚙️  PGE quality · sprint 2/5 · evaluator-quality ✗1`
- Silent (empty) when no pipeline is active

#### Auto-launch hook
- `UserPromptSubmit` hook detects `/pge*` prompts and opens indicator Terminal + notification watcher automatically

---

## [2.4.0] — 2026-04-17

### Added — `pge-idontcaretokenanymore` & `pge-god` premium modes

#### `pge-idontcaretokenanymore`
- `evaluator-quality` × 5 rounds, unanimous consensus per sprint
- All 5 rounds must pass (≥ 4/5 on all criteria)
- Up to 5 retries per sprint
- Round Variance Analysis in aggregate report

#### `pge-god`
- New `evaluator-godmode` agent — half-point scoring (1.0–5.0), ≥ 4.5/5 threshold
- Mandatory testing protocol: core flow exhaustion, edge case battery, error handling audit, visual perfection audit, performance observation, code quality deep review (reads source files)
- `evaluator-godmode` × 10 rounds, unanimous consensus per sprint
- Up to 10 retries per sprint
- Aggregate report includes Score Distribution Analysis and "Path to 10/10" section
- God Mode escalation offers fallback to `pge-idontcaretokenanymore`

---

## [2.3.0] — 2026-04-17

### Added — Base agents bundled in plugin
- `planner.md`, `generator.md`, `evaluator.md` now shipped in `src/agents/` and installed directly to `~/.claude/agents/`
- No prerequisite agents required — install.sh handles everything
- Existing agent files backed up as `.bak` before overwrite

---

## [2.2.0] — 2026-04-17

### Added — `pge-orchestrator` adaptive agent
- Complexity analysis (5 dimensions, 0–10 score) → auto base evaluator mode
- Per-sprint evaluator assignment from planner signals (`HIGH_RISK_SPRINTS`, `SUGGEST_MODE`)
- Adaptive retry escalation: standard → quality → strict → ultra on repeated failures
- Callable as `subagent_type: "pge-orchestrator"` from other agents

---

## [2.1.0] — 2026-04-16

### Changed — Evaluator & Skill Renames

All evaluator agent names and skill commands have been renamed for clarity and consistency:

| Old name | New name |
|----------|----------|
| `evaluator` (subagent_type) | `evaluator-standard` |
| `evaluator-premium` agent | `evaluator-quality` agent |
| `pge-premium` skill | `pge-quality` skill |
| `--evaluator premium` flag | `--evaluator quality` flag |

**Migration:** Re-run `install.sh` — it automatically removes legacy files (`pge-premium.md`, `evaluator-premium.md`) and installs the new names.

### Added — `evaluator-standard.md`

`evaluator-standard` is now a standalone complete agent file (previously only existed as a patch appended to the base `evaluator.md`). The PGE pipeline now explicitly uses `evaluator-standard` as its subagent_type for standard-mode evaluation, making all three evaluators (`evaluator-standard`, `evaluator-strict`, `evaluator-quality`) fully symmetric standalone files.

### Added — Single-Evaluator Repeated Mode in `pge-ultra`

`pge-ultra` now supports running **a single evaluator multiple times** per sprint in addition to the existing all-evaluator consensus mode.

New `--evaluator` flag for `pge-ultra`:
- `--evaluator all` (default): standard + strict + quality each run once (or ×rounds)
- `--evaluator standard`: only `evaluator-standard` runs, repeated `--rounds` times
- `--evaluator strict`: only `evaluator-strict` runs, repeated `--rounds` times
- `--evaluator quality`: only `evaluator-quality` runs, repeated `--rounds` times

**Example invocations:**
```bash
pge-ultra "idea"                              # all 3 × 1 round, majority
pge-ultra "idea" --rounds 2                   # all 3 × 2 rounds = 6 evaluations
pge-ultra "idea" --mode unanimous             # all 3 must agree
pge-ultra "idea" --evaluator strict --rounds 3        # strict × 3 rounds
pge-ultra "idea" --evaluator quality --rounds 3       # quality × 3 rounds
pge-ultra "idea" --evaluator standard --rounds 5 --mode unanimous  # standard × 5, all must pass
```

The aggregate report now includes a **Round Variance Analysis** section for single-evaluator multi-round runs, flagging criteria whose scores differ across rounds (indicating borderline implementation quality).

### Updated

- `pge-ultra.md` state schema: `evaluator_target` field replaces implicit "all" assumption
- `pge-ultra.md` Section 11: file naming table updated for all mode combinations
- `pge-ultra.md` escalation: Option 3 now suggests switching to single-evaluator mode as a de-escalation path
- `install.sh`: installs `evaluator-standard`, `evaluator-strict`, `evaluator-quality` (3 standalone files); cleans up legacy `evaluator-premium.md`
- `uninstall.sh`: removes all current and legacy evaluator variants
- `plugin.json`: v2.1.0, updated skill and agent install lists

---

## [2.0.0] — 2026-04-16

### Added

#### Multiple Evaluator Modes
- **`evaluator-strict`** — FAIL-biased evaluator. Every criterion starts at 2/5. Edge cases mandatory. Pass threshold 3/5 but harder to reach.
- **`evaluator-quality`** — Higher-bar evaluator with 4/5 pass threshold. Mandatory code review, performance observation, visual audit.
- **`--evaluator [standard|strict|quality]`** flag on `pge`.

#### New Skills
- **`pge-strict`** — Strict pipeline shortcut.
- **`pge-quality`** — Quality pipeline shortcut.
- **`pge-ultra`** — Multi-evaluator ultra orchestrator with `--mode` and `--rounds` flags.

### Changed

#### Token Efficiency — `pge.md` Rewritten
- Agent prompts compressed from 17–52 lines → 7–10 lines each. ~4,000–5,000 tokens saved per 5-sprint run.
- `pge_state.json` extended with `evaluator_mode` field.
- `evaluator.patch` updated to accept `[standard]` mode tag.

---

## [1.0.0] — 2026-04-16

### Added
- PGE Orchestrator skill (`pge.md`) — full Planner→Generator→Evaluator pipeline
- Sprint Contract system with hard-threshold 4-criteria scoring
- File-based IPC via `pge-workspace/` directory
- `--resume`, `--sprint N`, `--dry-run` flags
- Escalation protocol for 3 consecutive sprint failures
- Context-reset-safe design: each agent runs in isolated instance
- PGE Mode adapter sections for planner, generator, and evaluator agents
- `install.sh` / `uninstall.sh` for idempotent installation management
