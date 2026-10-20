import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = new URL('http://127.0.0.1:12306/mcp')
const transport = new StreamableHTTPClientTransport(MCP_URL)
const client = new Client({ name: 'probe', version: '1.0.0' }, { capabilities: {} })

try {
  await client.connect(transport)
  console.log('Connected!')
  
  // List tools
  const { tools } = await client.listTools()
  console.log('\nTools available:')
  for (const t of tools) {
    console.log(`  - ${t.name}: ${t.description?.slice(0, 100) || ''}`)
  }
  
  // Navigate to browser-ai-bridge GitHub page
  const navResult = await client.callTool({
    name: 'chrome_navigate',
    arguments: { url: 'https://github.com/chen-squared/browser-ai-bridge' }
  })
  console.log('\nNavigation result:', JSON.stringify(navResult, null, 2).slice(0, 300))

  // Read page content
  const readResult = await client.callTool({
    name: 'chrome_get_web_content',
    arguments: {}
  })
  console.log('\nPage content:', JSON.stringify(readResult, null, 2).slice(0, 1500))
  
  await transport.terminateSession()
  await client.close()
  console.log('\nDone!')
} catch (err) {
  console.log('ERROR:', err.message)
  try { await transport.terminateSession() } catch {}
  try { await client.close() } catch {}
}
