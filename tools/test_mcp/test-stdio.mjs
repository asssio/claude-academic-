/**
 * Test browser-ai-bridge-mcp using the SAME SDK Claude Code uses.
 * Spawns the stdio server as a subprocess, initializes it, lists tools,
 * then calls the health tool — identical to what Claude Code does on startup.
 */
import { spawn } from 'node:child_process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const serverPath = 'I:/claude-code/tools/browser-ai-bridge-mcp/dist/index.js'

async function main() {
  console.log('[test] spawning server:', serverPath)

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { BRIDGE_BASE_URL: 'http://localhost:3010', ...process.env },
    stderr: 'pipe',
  })

  const client = new Client(
    { name: 'claude-code-test', version: '1.0.0' },
    { capabilities: {} },
  )

  // Capture stderr from server
  transport.stderr?.on('data', (chunk) => {
    process.stdout.write(`[server-stderr] ${chunk}`)
  })

  console.log('[test] connecting...')
  await client.connect(transport)
  console.log('[test] ✅ connected!')

  // List tools (Claude Code does this on startup)
  console.log('[test] listing tools...')
  const { tools } = await client.listTools()
  console.log(`[test] ✅ ${tools.length} tools available:`)
  for (const t of tools) {
    console.log(`       - ${t.name}: ${t.description?.slice(0, 60)}...`)
  }

  // Call health check
  console.log('[test] calling health tool...')
  const result = await client.callTool({ name: 'health', arguments: {} })
  console.log('[test] ✅ health result:', JSON.stringify(result.content, null, 2))

  // Call list_providers
  console.log('[test] calling list_providers tool...')
  const providers = await client.callTool({ name: 'list_providers', arguments: {} })
  console.log('[test] ✅ providers:', JSON.stringify(providers.content, null, 2))

  await client.close()
  console.log('[test] 🎉 ALL TESTS PASSED')
}

main().catch((err) => {
  console.error('[test] ❌ FAILED:', err.message)
  process.exit(1)
})
