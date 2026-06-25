---
title: From four terminals to one good folder.
hide:
  - navigation
#  - toc       # uncomment this to ALSO hide the right outline
---

# Claude Code - From four terminals to one good folder

Notes from configuring Claude Code properly after several months of running it ad hoc across multiple sessions.

Claude Code is configured by a set of files in your home folder and in the repo (directory) your are working in. Without those files, every session starts cold and the orchestration happens by hand; with them, configuration carries context across sessions and prior work accumulates.

## Two folders hold the entire configuration layer

User-level config lives at `~/.claude/`. Project-level config lives at `<repo>/.claude/`. Both can contain the same files; the project layer overrides the user layer where they conflict, which is what allows a shared team setup without breaking individual preferences. A managed-policy layer sits above both for organizational use and is irrelevant to most homelab setups.

Inside either folder:

- `CLAUDE.md`: natural-language instructions loaded as system context at session start.
- `settings.json`: permissions, default model, hooks, environment variables.
- `commands/<name>.md`: slash commands.
- `agents/<name>.md`: subagents.
- `skills/<name>/SKILL.md`: skills.
- `.mcp.json`: MCP server definitions, typically project-only.

The `.local` variants (`CLAUDE.local.md`, `settings.local.json`) get gitignored automatically and house per-machine quirks or anything that should not propagate to the team copy.

## CLAUDE.md suggests, settings.json enforces

This is the most important distinction in the configuration model, and the one most often missed. CLAUDE.md is loaded as model context that the assistant tries to honor. settings.json gates actual tool execution. A rule like "do not delete files without confirmation" written in CLAUDE.md is a strong nudge. The same rule written as a `deny` entry in settings.json is a hard stop, regardless of what the model decides.

- **`CLAUDE.md`** sets **preferences**.
- **`settings.json`** and `hooks` **set hard limits**.

Minimal user-level `~/.claude/CLAUDE.md`, edited down to the only sentences that survived three months of use:

```markdown
# Environment
- WSL2 Ubuntu on Windows. VS Code via Remote-WSL.
- Plans before edits. Small diffs.

# Defaults
- Read-only against any database unless explicitly told otherwise.
- Treat .env, *.pem, anything in secrets/ as off-limits to read.
- Match existing code style in a repo over personal defaults.
```

Matching `~/.claude/settings.json`:

```json
{
  "model": "opusplan",
  "includeCoAuthoredBy": false,
  "permissions": {
    "allow": [
      "Read", "Grep", "Glob",
      "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)"
    ],
    "ask": ["Write", "Edit", "Bash(git push:*)"],
    "deny": [
      "Bash(rm -rf:*)",
      "Read(.env)", "Read(**/*.pem)", "Read(**/secrets/**)"
    ]
  }
}
```

Setting the default model to `opusplan` routes Opus to plan mode and Sonnet to execution. Most coding work does not need Opus to write the actual edits; it benefits from Opus thinking about which edits to make.

## Three primitives package repeated work

Commands, skills, and subagents are three distinct things that get conflated.

A **slash command** is a saved prompt with optional arguments. Lives at `.claude/commands/<name>.md`. Use when the wording is the only thing being reused, possibly with `$1` or `$ARGUMENTS` interpolation.

A **skill** is a saved procedure with structured steps and optional helper files. Lives at `.claude/skills/<name>/SKILL.md`. Use when the work has multiple steps, expects a specific output shape, or benefits from supporting files (templates, scripts) colocated with the procedure.

A **subagent** is a saved worker that runs in its own context window with its own tool permissions. Lives at `.claude/agents/<name>.md`. Use when the work would otherwise pollute the main session's context, or when the work needs narrower tool access than the main session has.

Mnemonic: command is a saved prompt, skill is a saved procedure, subagent is a saved worker with its own brain.

## Example: a scripts inventory command

A typical case where a slash command earns the trouble: documenting a `~/scripts/` directory that has accumulated `final.py`, `final_v2.py`, `final_REAL.py`, and several files last touched in 2022. The prompt for it gets typed a few times before it becomes obvious it belongs in a file.

`.claude/commands/inventory-scripts.md`:

```markdown
---
description: Inventory a scripts directory and propose a sane organization
argument-hint: [path]
allowed-tools: Read, Glob, Grep, Bash
model: sonnet
---
Look at directory `$1`. Do not move or delete anything.

1. Find all .py, .sh, .sql, .ps1 files. Group by extension. Note total count and size.
2. Read the first 30 lines of each (skip files >1MB). Infer purpose in one sentence.
3. Flag suspected duplicates and near-duplicates: similar names, similar imports, similar first lines.
4. Flag risk: hardcoded paths, embedded secrets, references to hosts or databases that may no longer exist.
5. Propose a structure by purpose (backups/, db-pulls/, monitoring/, one-offs/, archive/), with rename suggestions for the `final_REAL_v3` situation.
6. Write the plan to PLAN.md. Do not execute.
```
> The `$1` is the first argument on the command line just line any other script.

Invoked from a session:

```
> /inventory-scripts ~/scripts
```

The command writes its analysis to `PLAN.md`. A follow-up message ("Execute the plan. Move, do not delete. Generate INDEX.md describing every script. Log moves to MOVES.log.") triggers the actual reorganization with a paper trail.

The same pattern transfers cleanly to `~/sql/` directories, archived dotfiles, and the `/tmp/stuff/` folder that has been on the disk for two years.

## Subagents earn their own context window, at a cost

The point of a subagent is not raw capability; the main session can do anything a subagent can. The point is keeping the main session's context clean. When a subagent reads twenty files looking for a pattern, only its summary returns to the main session. The twenty file reads stay in the subagent's context and disappear when it exits.

This is the highest-leverage feature for long sessions and also the most expensive feature by token count. Subagent-heavy workflows commonly burn around 7x the tokens of a single-thread session, since each subagent carries its own system prompt and context. Worth it for parallel fan-out (read N repos at once, return N summaries) and for noisy investigation. Not worth it for one-off edits.

Subagents are markdown files with YAML frontmatter:

```markdown
---
name: schema-investigator
description: Read-only DB and schema analysis. Use proactively for schema pulls and "what does this table do" questions.
tools: Read, Grep, Glob, Bash
model: sonnet
---
Investigate schemas and report findings. Never modify data or run DDL/DML.

When invoked:
1. Locate connection config without echoing secrets.
2. Enumerate requested objects.
3. Return a tight summary, not raw dumps.
```

`tools` is the safety control: a subagent without `Write` cannot write even if asked. `model` is the routing control: this agent will run on Sonnet regardless of what the main session is on. `description` is what the main agent uses to decide when to delegate, so it should read like a job posting rather than a label.

## Model routing has four levers and no autorouter

There is no built-in "route this task to the right model" setting, and at the time of writing it is a requested feature rather than a shipped one. Routing is manual at four levels of increasing specificity:

1. Live, in-session: `/model sonnet | opus | haiku | opusplan`.
2. At launch: `claude --model sonnet`.
3. As a default: the `model` key in `settings.json`.
4. Per subagent: the `model:` field in agent frontmatter.

A heuristic that holds up across mixed sysadmin and coding work:

- Sonnet by default. Around 90% of work fits.
- Opus when synthesizing across many inputs, debugging subtle multi-file behavior, or making architecture decisions.
- Haiku for mechanical bulk work: renames, formatting, simple transforms.
- `opusplan` as the session default when work involves real planning. Opus during plan mode, Sonnet during execution. Substantially cheaper than running Opus throughout, with no quality drop on the execution side.

Setting `model:` per subagent removes most day-to-day routing decisions. A `repo-summarizer` pinned to Sonnet and an `instruction-writer` pinned to Opus will route themselves correctly without intervention.

## Headless mode connects Claude Code to the rest of the CLI

`claude -p "<prompt>"` runs non-interactively. No session, no editor. It reads `stdin`, prints to `stdout`, and `exits`. With `--output-format json` it becomes a normal tool inside bash pipelines, cron jobs, and CI.

```bash
# Triage SSH brute-force attempts from auth.log
cat /var/log/auth.log \
  | claude -p "Group failed SSH attempts by source IP. Output JSON: [{ip, count, first_seen, ports[]}]" \
           --output-format json \
  | jq '.[] | select(.count > 10)'
```

This is the bridge from "AI in the editor" to "AI as a step inside an existing pipeline." A surprising amount of homelab automation (log triage, schema documentation, repo summarization, certificate inventory) collapses into headless one-liners once the corresponding subagents or commands exist.

`--dangerously-skip-permissions` bypasses the per-step confirmations and exists for trusted automation. It is appropriate for sandboxes and inappropriate against any system with real data, since the confirmation prompt is the only thing standing between a runaway tool call and the filesystem.

## A pipeline made of these parts

The payoff for setting all of this up: complex workflows assemble from these primitives without manual coordination at runtime.

Done by hand, reading four legacy repos and synthesizing their summaries into instructions for a downstream agent takes an afternoon and four browser tabs. Configured, it is one command:

1. One main session. `/add-dir` each repo into context.
2. A slash command (`/build-agent-spec`) delegates to a `repo-summarizer` subagent per repo, in parallel. Each runs on Sonnet, read-only, and writes its summary to `summaries/<repo>.md`.
3. Once all summaries exist, the same command delegates to an `instruction-writer` subagent on Opus to synthesize the final spec from the collected files.

Total interaction at the keyboard: one command. The configuration files do the orchestration. Once the interactive version works, the same run can execute headlessly via `claude -p "/build-agent-spec ..."` and live in cron.

## Cheat block

In-session slash commands:

| command       | purpose                                                |
|---------------|--------------------------------------------------------|
| `/init`       | bootstrap a project CLAUDE.md from the repo            |
| `/memory`     | show all loaded instructions; debug missing rules here |
| `/model`      | switch model live in the current session               |
| `/agents`     | create and manage subagents interactively              |
| `/add-dir`    | bring another directory into the session's context     |
| `/rewind`     | roll back Claude's edits to an earlier state           |
| `/compact`    | summarize current context to free token space          |
| `/clear`      | reset context entirely                                 |
| `/ide`        | connect an external terminal to a VS Code window       |

Keyboard:

| key           | action                                                 |
|---------------|--------------------------------------------------------|
| `Shift+Tab`   | cycle Default -> Auto-Accept -> Plan modes             |
| `Ctrl+Esc`    | open the VS Code extension panel                       |
| `Ctrl+B`      | background a running task                              |
| `Alt+K`       | insert `@file#lines` from the current editor selection |

CLI flags:

| flag                              | purpose                                       |
|-----------------------------------|-----------------------------------------------|
| `--model <alias>`                 | override model for this launch                |
| `-p "..."` / `--print`            | headless, non-interactive                     |
| `--output-format json`            | parseable output                              |
| `--resume`                        | reopen a past conversation                    |
| `--add-dir <path>`                | extra working directory at launch             |
| `--dangerously-skip-permissions`  | bypass confirmations; sandbox only            |

Model aliases:

| alias       | when to reach for it                                  |
|-------------|-------------------------------------------------------|
| `sonnet`    | default, ~90% of work                                 |
| `opus`      | architecture, multi-input synthesis, hard debugging   |
| `haiku`     | mechanical bulk, simple lookups, raw speed            |
| `opusplan`  | session default when work involves real planning      |

File layout:

```
~/.claude/                  	# user, global
  CLAUDE.md
  settings.json
  commands/<name>.md
  agents/<name>.md
  skills/<name>/SKILL.md

<repo>/.claude/             	# project, in git
  settings.json
  settings.local.json       	# gitignored
  rules/*.md                	# path-scoped instructions
  commands/, agents/, skills/
  .mcp.json
<repo>/CLAUDE.md            	# project instructions, in git
<repo>/CLAUDE.local.md      	# personal project notes, gitignored
```

One operating habit subsumes all of the above: if a prompt or explanation gets typed twice, it belongs in a file. CLAUDE.md line, slash command, skill, or subagent. The choice of which is mechanical once the three primitives are clear.
