# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
# Install dependencies (requires Bun >= 1.3.10)
bun install

# Start dev mode (isolated config in .claude-dev/, no side effects)
bun run start

# Start with host ~/.claude config (inherits API key, plugins)
bun run start:home

# MCP server mode
bun run mcp

# Dev mode with file watch hot-reload
bun run dev
```

No test runner or linter is configured in this repository. The project uses `bun run start` as the primary development workflow. Type checking is implicit through Bun's runtime (no `tsc` build step).

## Architecture

This is the full source code of the `@anthropic-ai/claude-code` CLI. It runs on **Bun** with TypeScript + React (via **Ink**, a React renderer for terminals).

### Entry points

- `src/entrypoints/dev-cli.tsx` → `cli.tsx` — CLI mode (the main application)
- `src/entrypoints/dev-mcp.ts` → `mcp.ts` — MCP server mode
- `src/entrypoints/init.ts` — `init()` hook called at startup (config loading, auth, telemetry setup)

### Directory structure

- `src/commands/` — Slash command implementations (registered in `src/commands.ts`). Each command exports a `call()` function returning React nodes.
- `src/tools/` — Tool definitions (one directory per tool: BashTool, FileReadTool, FileWriteTool, GrepTool, GlobTool, AgentTool, etc.). Registered in `src/tools.ts`.
- `src/skills/` — User-invocable skill system. `bundled/` for built-in skills, `mcpSkills.ts` for MCP-provided skills.
- `src/utils/` — All utility modules (platform, env, ide, git, config, etc.).
- `src/components/` — React/Ink UI components.
- `src/hooks/` — React hooks for state management, IDE integration, input handling, terminal size, etc.
- `src/screens/` — Top-level screens: `REPL.tsx` (main interactive loop), `Doctor.tsx` (diagnostics).
- `src/services/` — External service integrations (MCP, analytics, API, OAuth, policy limits, LSP).
- `src/state/` — Application state store (AppState.tsx).
- `src/main.tsx` — Main entry: CLI arg parsing via commander, React root rendering, REPL launch.
- `src/ink.ts` — Custom Ink (terminal React renderer) wrapper.

### Key concepts

- **Commands** (`src/commands.ts`) — Slash commands like `/init`, `/ide`, `/commit`, `/cost`. Registered with `Command` type. Each has a `call(onDone, context, args)` function returning React nodes.
- **Tools** (`src/tools/`) — AI-callable tools (Bash, FileRead, FileWrite, etc.). Each tool extends a base `Tool` class with schema, prompt, and validation.
- **Skills** (`src/skills/`) — User-invocable skills that can be `/`-prefixed commands. Can be bundled, loaded from directories, or provided via MCP.
- **React/Ink rendering** — The entire UI (including the REPL prompt, command output, tool results) renders through Ink, a React renderer for terminals. Components output JSX that maps to terminal characters.
- **Bun features** — Uses `bun:bundle` `feature()` for dead-code elimination of Ant-internal features. `bunfig.toml` loads `preload.ts` which sets `globalThis.MACRO` version constants.

### Dev configuration

- `installRuntimeGlobals.ts` sets `CLAUDE_CONFIG_DIR` to `<cwd>/.claude-dev/` (isolated from the installed Claude Code's `~/.claude`).
- `preload.ts` sets `globalThis.MACRO` and changes to `CALLER_DIR` if set.
- `src/dev/` contains dev-only bootstrap code.
- `deps/` contains vendored internal dependencies (`@ant/computer-use-mcp`, `@ant/claude-for-chrome-mcp`, etc.).
- `vendor/` contains native module shims and ripgrep binary.

### Platform support

Platform detection is in `src/utils/platform.ts` (`getPlatform()` returns `'windows' | 'macos' | 'linux' | 'wsl'`). Windows-specific path handling is in `src/utils/windowsPaths.ts` and `ide.ts` (which has `findVSCodePathOnWindows()` for locating `code.cmd` outside bash's PATH).

## IDE Integration

The `/ide` command lives in `src/commands/ide/`. IDE detection logic is in `src/utils/ide.ts`:
- `detectIDEs(true/false)` — Reads lockfiles from `~/.claude/ide/` (plus `CLAUDE_CONFIG_DIR/ide/`) to find running IDE extensions.
- `findAvailableIDE()` — Polls `detectIDEs(false)` every 1s for 30s for auto-connect.
- `detectRunningIDEs()` — OS process detection to find running IDE processes regardless of extension status.
- Lockfiles are JSON files with workspace folders, PID, transport type, and auth token.
