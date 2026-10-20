/**
 * Fix Chrome MCP Server "Already connected to transport" error
 * by reloading the extension's service worker via chrome://extensions
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = 'http://127.0.0.1:12306/mcp'
const MAX_RETRIES = 3

async function tryConnect() {
  const transport = new StreamableHTTPClientTransport(new URL(url))
  const client = new Client(
    { name: 'claude-code-recovery', version: '1.0.0' },
    { capabilities: {} },
  )
  await client.connect(transport)
  const { tools } = await client.listTools()
  await client.close()
  return tools.length
}

async function main() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    console.log(`[fix] attempt ${i}/${MAX_RETRIES}...`)
    try {
      const count = await tryConnect()
      console.log(`[fix] ✅ Connected! ${count} tools available`)
      return
    } catch (err) {
      console.log(`[fix] ❌ ${err.message?.slice(0, 120)}`)
      if (i < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }
  console.log('\n[fix] Could not resolve automatically.')
  console.log('     → Open chrome://extensions → find "Chrome MCP Server" → click Reload 🔄')
  console.log('     → Then restart Claude Code (exit and rejoin this session)')
}

main()
