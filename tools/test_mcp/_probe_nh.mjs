import { spawn } from 'node:child_process'

const PORT = 12306
const indexJs = 'C:/Users/Administrator/AppData/Roaming/npm/node_modules/mcp-chrome-bridge/dist/index.js'
const nodeExe = process.execPath

const child = spawn(nodeExe, [indexJs], {
  stdio: ['pipe', 'pipe', 'pipe'],
})

child.stdout.on('data', d => process.stdout.write(`[nh-out] ${d}`))
child.stderr.on('data', d => process.stderr.write(`[nh-err] ${d}`))

await new Promise(r => setTimeout(r, 1000))

// Native Messaging protocol: 4-byte LE length + JSON
const msg = JSON.stringify({ type: 'start', payload: { port: PORT } })
const msgBuf = Buffer.from(msg, 'utf8')
const header = Buffer.alloc(4)
header.writeUInt32LE(msgBuf.length, 0)

child.stdin.write(Buffer.concat([header, msgBuf]))
// Don't end stdin — Native Host needs it alive to keep running

console.log(`[probe] wrote START to PID ${child.pid}`)

setTimeout(async () => {
  const { createConnection } = await import('node:net')
  const sock = createConnection(PORT, '127.0.0.1')
  sock.on('connect', () => {
    console.log('[probe] ✅ PORT IS REACHABLE')
    sock.destroy()
    child.kill()
    process.exit(0)
  })
  sock.on('error', () => {
    console.log('[probe] ❌ port not reachable yet')
    sock.destroy()
    setTimeout(() => { child.kill(); process.exit(1) }, 3000)
  })
}, 5000)
