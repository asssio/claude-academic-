/**
 * Test chrome-mcp-server (HTTP/SSE transport) the way Claude Code does it.
 * Uses StreamableHTTPClientTransport from the SDK.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = 'http://127.0.0.1:12306/mcp'

async function main() {
  console.log('[test] connecting to HTTP MCP:', url)

  const transport = new StreamableHTTPClientTransport(new URL(url))

  const client = new Client(
    { name: 'claude-code-test', version: '1.0.0' },
    { capabilities: {} },
  )

  console.log('[test] connecting...')
  await client.connect(transport)
  console.log('[test] ✅ connected!')

  console.log('[test] listing tools...')
  const { tools } = await client.listTools()
  console.log(`[test] ✅ ${tools.length} tools available:`)
  for (const t of tools) {
    console.log(`       - ${t.name}: ${t.description?.slice(0, 80)}`)
  }

  await client.close()
  console.log('[test] 🎉 HTTP MCP TEST PASSED')
}

main().catch((err) => {
  console.error('[test] ❌ HTTP MCP FAILED:', err.message)
  process.exit(1)
})
