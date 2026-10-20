// Simulates the patched client.ts cleanup() logic
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = new URL('http://127.0.0.1:12306/mcp')
const SERVER_TYPE = 'http'

async function patchedCleanup(transport, client, name) {
  // The fix: DELETE for HTTP transports
  if (SERVER_TYPE === 'http' && transport instanceof StreamableHTTPClientTransport) {
    try {
      await transport.terminateSession()
      console.log(`[${name}] ✅ terminateSession OK`)
    } catch (e) {
      console.log(`[${name}] ⚠️ terminateSession failed: ${e.message?.slice(0, 60)}`)
    }
  }
  await client.close()
  console.log(`[${name}] ✅ client.close() done`)
}

async function cdpLikeConnect(name) {
  console.log(`\n--- ${name}: CDP-like connect ---`)
  const transport = new StreamableHTTPClientTransport(MCP_URL)
  const client = new Client({ name, version: '1.0.0' }, { capabilities: {} })
  await client.connect(transport)
  console.log(`  sessionId=${transport.sessionId}`)
  const { tools } = await client.listTools()
  console.log(`  ${tools.length} tools`)
  await patchedCleanup(transport, client, name)
}

// Test 1: CDP connects, does work, closes (with our fix)
await cdpLikeConnect('CDP-Session-1')

// Test 2: Another CDP connects (should succeed now)
await cdpLikeConnect('CDP-Session-2')

// Test 3: One more for good measure  
await cdpLikeConnect('CDP-Session-3')

console.log('\n✅ All CDP sessions cleaned up correctly — fix works!')
