---
name: chrome-mcp
description: Control Chrome browser via MCP (Chrome extension + Native Messaging Host). Access tabs, read page content, interact with DOM, take screenshots, navigate, execute JavaScript, and automate browser workflows.
when_to_use: When user needs to interact with the Chrome browser: read page content, click elements, fill forms, take screenshots, navigate URLs, execute JavaScript in page context, read console/network logs, or automate browser tasks.

---

# Chrome MCP Skill

Control a Chrome browser with the Claude in Chrome extension via MCP. The MCP server is named `claude-in-chrome`.

## Architecture Overview

Two Chrome MCP implementations exist:

### 1. Local (Built-in) — Claude Code `claude-in-chrome`

The built-in approach uses **Native Messaging** between Chrome and the Claude Code CLI:

```
Claude Code CLI ←→ Native Host (Unix socket / Windows pipe) ←→ Chrome Extension ←→ Chrome Browser
```

- **Server name**: `claude-in-chrome`
- **Transport**: STDIO via `process.execPath --claude-in-chrome-mcp`
- **Tools**: 19 browser tools (listed below)
- **Connection**: Automatic when Chrome extension is installed + CLI is running
- **Key file**: `src/utils/claudeInChrome/chromeNativeHost.ts` — the pure TypeScript native host
- **Setup**: `src/utils/claudeInChrome/setup.ts` — installs native host manifest + registers with Chrome

### 2. External (`hangwin/mcp-chrome`)

A community Chrome MCP project that uses a Chrome extension + `mcp-chrome-bridge` npm package:

```
AI Client ←→ mcp-chrome-bridge (Streamable HTTP / STDIO) ←→ Chrome Extension ←→ Chrome Browser
```

- **GitHub**: https://github.com/hangwin/mcp-chrome
- **Install**: `npm install -g mcp-chrome-bridge`
- **Extension**: Load unpacked from `releases/` directory in the repo
- **Connection**: Streamable HTTP (recommended) or STDIO
- **Tools**: Similar set of browser tools via Chrome extension

## Available Tools

All tools are accessed via `mcp__claude-in-chrome__<tool_name>` (local) or the tool name directly (external).

### Tab Management

| Tool | Purpose |
|------|---------|
| `tabs_context_mcp` | Get current MCP tab group context; create new group if empty |
| `tabs_create_mcp` | Create a new empty tab in the MCP tab group |
| `switch_browser` | Switch to a different Chrome browser with the extension |

### Page Reading

| Tool | Purpose |
|------|---------|
| `read_page` | Get accessibility tree of page elements (all or interactive only) |
| `get_page_text` | Extract raw text content, prioritizing article content |
| `find` | Natural language search for elements (e.g., "search bar", "login button") |

### Page Interaction

| Tool | Purpose |
|------|---------|
| `computer` | Mouse/keyboard automation: click, type, screenshot, scroll, drag, hover, zoom |
| `form_input` | Set values in form elements using reference ID |
| `navigate` | Navigate to URL or go forward/back |
| `resize_window` | Resize browser window to specified dimensions |
| `javascript_tool` | Execute JavaScript in page context |

### Data & Debugging

| Tool | Purpose |
|------|---------|
| `read_console_messages` | Read browser console (log, error, warn) with regex filtering |
| `read_network_requests` | Read HTTP requests (XHR, Fetch) with URL filtering |

### Advanced

| Tool | Purpose |
|------|---------|
| `upload_image` | Upload screenshot to file input or drag & drop target |
| `gif_creator` | Record browser actions and export as animated GIF |
| `update_plan` | Present a plan for user approval (domain whitelist) |
| `shortcuts_list` | List available browser shortcuts/workflows |
| `shortcuts_execute` | Execute a shortcut/workflow |

## Usage Patterns

### Step 1: Get Tab Context

Always start with `tabs_context_mcp` to know available tabs:

```
mcp__claude-in-chrome__tabs_context_mcp({})
```

### Step 2: Navigate to URL

```
mcp__claude-in-chrome__navigate({
  url: "https://example.com",
  tabId: <tabId from step 1>
})
```

### Step 3: Read Page Content

```
mcp__claude-in-chrome__read_page({
  tabId: <tabId>,
  filter: "interactive"
})
```

### Step 4: Find & Interact

```
mcp__claude-in-chrome__find({
  query: "search bar",
  tabId: <tabId>
})
```

Then use the `ref` from the result with `form_input` or `computer`.

### Common Workflow: Click Element

1. `tabs_context_mcp` → get tabId
2. `read_page` → get element refs
3. `computer({action: "screenshot", tabId})` → see the page
4. `computer({action: "left_click", coordinate: [x, y], tabId})` → click

## Computer Tool Actions

The `computer` tool supports these actions:

| Action | Required Params |
|--------|----------------|
| `left_click` | `coordinate` or `ref` |
| `right_click` | `coordinate` |
| `double_click` | `coordinate` |
| `triple_click` | `coordinate` |
| `type` | `text` |
| `screenshot` | (none) |
| `wait` | `duration` (seconds, max 30) |
| `scroll` | `coordinate` + `scroll_direction` |
| `key` | `text` (space-separated keys) |
| `left_click_drag` | `start_coordinate` + `coordinate` |
| `zoom` | `region` [x0, y0, x1, y1] |
| `scroll_to` | `ref` |
| `hover` | `coordinate` or `ref` |

Keyboard shortcuts: `"cmd+a"` (Mac) or `"ctrl+a"` (Windows/Linux) for select all.

## Prerequisites

### For Local (Built-in)

1. **Chrome extension installed**: Claude in Chrome extension (ID: `fcoeoabgfenejglbffodgkkbkcdhcgfn`)
2. **Extension is running**: Must be enabled and active
3. **Native host registered**: Automatic on CLI startup via `installChromeNativeHostManifest()`
4. **Same Claude.ai account**: Extension and CLI must use the same account

The `setupClaudeInChrome()` function in `setup.ts` handles all of this automatically when the CLI starts.

### For External (hangwin/mcp-chrome)

1. **Install npm package**: `npm install -g mcp-chrome-bridge`
2. **Load Chrome extension**: Unpack from the repo's `releases/` directory
3. **Configure MCP client**: Point to the bridge (Streamable HTTP or STDIO)

## Key Code References

| File | Purpose |
|------|---------|
| `src/utils/claudeInChrome/chromeNativeHost.ts` | Native messaging host implementation |
| `src/utils/claudeInChrome/setup.ts` | Chrome MCP server setup + extension detection |
| `src/utils/claudeInChrome/mcpServer.ts` | MCP server creation + bridge config |
| `src/utils/claudeInChrome/common.ts` | Browser detection, socket paths, native messaging |
| `deps/@ant/claude-for-chrome-mcp/src/browserTools.ts` | All 19 browser tool definitions |

## Known Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| `Browser extension is not connected` | Ensure Claude in Chrome extension is installed and running |
| `Failed to reconnect` | Kill stale NH process, let Chrome auto-restart |
| `Already connected to a transport` | Stale session — fix cache key (`name` not `getServerCacheKey`) + ensure `terminateSession()` is called on close |
| Extension not detected | Check all Chromium browser data paths; restart Chrome |
| Tool calls fail | Verify `tabs_context_mcp` was called first to get valid `tabId` |
| Permission denied | Extension needs user approval for domain access; use `update_plan` first |