#!/usr/bin/env node
/**
 * browser-ai-bridge-mcp
 *
 * MCP Server wrapper for the browser-ai-bridge HTTP service.
 * Proxies the running http://localhost:3010 REST API as MCP tools,
 * allowing Claude Code to send messages to any web AI provider
 * (ChatGPT, DeepSeek, Claude, Gemini, Grok, Qwen).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BRIDGE_BASE =
  process.env.BRIDGE_BASE_URL ?? 'http://localhost:3010'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bridgeFetch(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const url = `${BRIDGE_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `browser-ai-bridge returned ${res.status} for ${path}: ${text}`,
    )
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ChatCompletionSchema = z.object({
  /** Provider id: chatgpt | deepseek | claude | gemini | grok | qwen */
  provider: z.string().optional(),
  /** Model label (informational, does not affect routing) */
  model: z.string().optional(),
  /** Multi-turn message history */
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1),
  /** Session ID for multi-turn (reuses same browser tab) */
  conversationId: z.string().optional(),
  /** Toggle smart search (provider-dependent) */
  enableSearch: z.boolean().optional(),
  /** Toggle deep reasoning (provider-dependent) */
  enableReasoning: z.boolean().optional(),
  /** Prompt assembly strategy: latest-user (default) | trailing-users | full-messages */
  promptMode: z
    .enum(['latest-user', 'trailing-users', 'full-messages'])
    .optional(),
  /** Merge consecutive user messages at the tail */
  includeTrailingUserMessages: z.boolean().optional(),
  /** Inject system message as prefix on first turn */
  injectSystemOnFirstTurn: z.boolean().optional(),
  /** Only preview the prompt, do not operate the browser */
  dryRun: z.boolean().optional(),
})

const OpenSessionSchema = z.object({
  /** Provider id to open login page for */
  provider: z.string(),
})

const ClearSessionSchema = z.object({
  provider: z.string(),
  conversationId: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'browser-ai-bridge-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

// -- List Tools -------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'chat',
      description:
        'Send a message to a web-based AI provider (ChatGPT, DeepSeek, Claude, Gemini, Grok, Qwen) through the browser-ai-bridge. Returns the assistant reply in OpenAI-compatible format.',
      inputSchema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            description:
              'Provider id. One of: chatgpt, deepseek, claude, gemini, grok, qwen. Defaults to the bridge\'s DEFAULT_PROVIDER.',
            enum: ['chatgpt', 'deepseek', 'claude', 'gemini', 'grok', 'qwen'],
          },
          model: {
            type: 'string',
            description:
              'Model label (informational only, does not affect routing). e.g. "deepseek-web", "gpt-4o".',
          },
          messages: {
            type: 'array',
            description:
              'Message history. At least one message required.',
            items: {
              type: 'object',
              properties: {
                role: {
                  type: 'string',
                  enum: ['system', 'user', 'assistant'],
                },
                content: { type: 'string' },
              },
              required: ['role', 'content'],
            },
          },
          conversationId: {
            type: 'string',
            description:
              'Optional session ID. Reuses the same browser tab for multi-turn conversation. Different providers are independent even with the same ID.',
          },
          enableSearch: {
            type: 'boolean',
            description:
              'Toggle smart search on the web UI (DeepSeek, Qwen). Omit to keep current state.',
          },
          enableReasoning: {
            type: 'boolean',
            description:
              'Toggle deep reasoning / thinking mode (DeepSeek, Qwen). Omit to keep current state.',
          },
          promptMode: {
            type: 'string',
            description:
              'How to assemble the prompt from message history. Default: latest-user.',
            enum: ['latest-user', 'trailing-users', 'full-messages'],
          },
          includeTrailingUserMessages: {
            type: 'boolean',
            description:
              'Merge consecutive trailing user messages into one before sending.',
          },
          injectSystemOnFirstTurn: {
            type: 'boolean',
            description:
              'On first turn, inject the system message as a text prefix into the input box.',
          },
          dryRun: {
            type: 'boolean',
            description:
              'If true, returns the assembled prompt without operating the browser.',
          },
        },
        required: ['messages'],
      },
    },
    {
      name: 'list_providers',
      description:
        'List all available AI providers supported by browser-ai-bridge (ChatGPT, DeepSeek, Claude, Gemini, Grok, Qwen) with their current selector configuration.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_models',
      description:
        'Return available providers in OpenAI /v1/models compatible format.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_sessions',
      description:
        'List currently active browser sessions (in-memory, lost on service restart).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'open_session',
      description:
        'Open the login page for a given provider and bring the browser window to foreground. Call this first if a provider needs authentication.',
      inputSchema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            description: 'Provider id',
            enum: ['chatgpt', 'deepseek', 'claude', 'gemini', 'grok', 'qwen'],
          },
        },
        required: ['provider'],
      },
    },
    {
      name: 'clear_session',
      description:
        'Clear a conversation session mapping for a provider. Use this when you want to start a fresh conversation.',
      inputSchema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            description: 'Provider id',
            enum: ['chatgpt', 'deepseek', 'claude', 'gemini', 'grok', 'qwen'],
          },
          conversationId: {
            type: 'string',
            description:
              'Optional conversation ID. If omitted, all sessions for the provider are cleared.',
          },
        },
        required: ['provider'],
      },
    },
    {
      name: 'health',
      description:
        'Check the browser-ai-bridge service health status.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}))

// -- Call Tool --------------------------------------------------------------

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        // ------------------------------------------------------------------
        case 'chat': {
          const parsed = ChatCompletionSchema.parse(args)
          const body: Record<string, unknown> = {
            messages: parsed.messages,
          }
          if (parsed.provider) body.provider = parsed.provider
          if (parsed.model) body.model = parsed.model
          if (parsed.conversationId)
            body.conversationId = parsed.conversationId
          if (parsed.enableSearch !== undefined)
            body.enableSearch = parsed.enableSearch
          if (parsed.enableReasoning !== undefined)
            body.enableReasoning = parsed.enableReasoning
          if (parsed.promptMode) body.promptMode = parsed.promptMode
          if (parsed.includeTrailingUserMessages !== undefined)
            body.includeTrailingUserMessages =
              parsed.includeTrailingUserMessages
          if (parsed.injectSystemOnFirstTurn !== undefined)
            body.injectSystemOnFirstTurn = parsed.injectSystemOnFirstTurn
          if (parsed.dryRun !== undefined) body.dryRun = parsed.dryRun

          const result = await bridgeFetch('/v1/chat/completions', {
            method: 'POST',
            body: JSON.stringify(body),
          })

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        case 'list_providers': {
          const result = await bridgeFetch('/providers')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        case 'list_models': {
          const result = await bridgeFetch('/v1/models')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        case 'list_sessions': {
          const result = await bridgeFetch('/sessions')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        case 'open_session': {
          const { provider } = OpenSessionSchema.parse(args)
          const result = await bridgeFetch(
            `/session/${encodeURIComponent(provider)}/open`,
            { method: 'POST' },
          )
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        case 'clear_session': {
          const { provider, conversationId } = ClearSessionSchema.parse(args)
          const result = await bridgeFetch(
            `/session/${encodeURIComponent(provider)}/clear`,
            {
              method: 'POST',
              body: JSON.stringify({ conversationId }),
            },
          )
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        case 'health': {
          const result = await bridgeFetch('/health')
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          }
        }

        // ------------------------------------------------------------------
        default:
          return {
            content: [
              {
                type: 'text' as const,
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text' as const, text: `Error: ${msg}` }],
        isError: true,
      }
    }
  },
)

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(
    `[browser-ai-bridge-mcp] connected → bridging ${BRIDGE_BASE}`,
  )
}

main().catch((err) => {
  console.error('[browser-ai-bridge-mcp] fatal:', err)
  process.exit(1)
})
