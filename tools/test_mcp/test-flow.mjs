import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = new URL('http://127.0.0.1:12306/mcp')

async function connectAndClose(useDelete) {
  console.log(`\n--- Test: connect → ${useDelete ? 'DELETE+close' : 'close only'} ---`)
  const transport = new StreamableHTTPClientTransport(MCP_URL)
  const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} })
  try {
    await client.connect(transport)
    console.log(`  connected, sessionId=${transport.sessionId}`)
    const { tools } = await client.listTools()
    console.log(`  ${tools.length} tools available`)
    if (useDelete) {
      await transport.terminateSession()
      console.log('  → terminated session via DELETE')
    } else {
      console.log('  → skipping DELETE (simulating buggy close)')
    }
    await client.close()
    console.log('  → client.close() done')
    return transport.sessionId
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message?.slice(0, 120)}`)
    try { await client.close() } catch {}
    return null
  }
}

async function tryConnect(label) {
  console.log(`\n--- ${label}: fresh client connects ---`)
  const transport = new StreamableHTTPClientTransport(MCP_URL)
  const client = new Client({ name: 'probe', version: '1.0.0' }, { capabilities: {} })
  try {
    await client.connect(transport)
    const { tools } = await client.listTools()
    console.log(`  ✅ connected! ${tools.length} tools`)
    await transport.terminateSession()
    await client.close()
    return true
  } catch (err) {
    console.log(`  ❌ ${err.message?.slice(0, 120)}`)
    try { await client.close() } catch {}
    return false
  }
}

// 1. Establish fresh NH session from recovery tool (already done — NH is up)
// 2. Connect client A, close WITHOUT DELETE (simulating bug)
await connectAndClose(false)

// 3. Try new client B → should FAIL ("Already connected")
const b = await tryConnect('Client B (after buggy close)')

// 4. Now NH is stuck. Recovery tool's terminateSession from earlier step 
//    has already freed it, so try B again after manual cleanup
if (!b) {
  console.log('\n--- Manual cleanup: sending DELETE to clear stale session ---')
  try {
    const t = new StreamableHTTPClientTransport(MCP_URL)
    const c = new Client({ name: 'cleanup', version: '1.0.0' }, { capabilities: {} })
    await c.connect(t)
    await t.terminateSession()
    await c.close()
    console.log('  cleanup DELETE sent')
  } catch (e) {
    console.log(`  cleanup failed: ${e.message?.slice(0, 80)}`)
  }
}

// 5. Client C with proper DELETE+close flow (the fix)
await connectAndClose(true)

// 6. Now Client D should connect successfully
const d = await tryConnect('Client D (after proper DELETE close)')

console.log('\n=== RESULT ===')
console.log(`Client B (no DELETE): ${b ? 'OK' : 'REJECTED (expected — bug present)'}`)
console.log(`Client D (with DELETE): ${d ? 'OK' : 'UNEXPECTED FAILURE'}`)
