/**
 * chrome-mcp-server Recovery Tool
 * ==============================
 *
 * Architecture:
 *   Chrome Extension (background.js)
 *     └─ chrome.runtime.connectNative("com.chromemcp.nativehost")
 *        └─ Native Host (Node.exe subprocess)
 *           ├─ MCP StreamableHTTP Server on 127.0.0.1:12306  ← Claude Code connects here
 *           └─ Playwright → Chromium (CDP)
 *
 * Failure mode:
 *   1. Claude Code starts → creates StreamableHTTPClientTransport → initialize
 *   2. Native Host returns Mcp-Session-Id → stored in transport._sessionId
 *   3. Claude Code crashes/force-quits → DELETE request NOT sent (SDK close() does NOT
 *      call terminateSession(); it only aborts the fetch controller)
 *   4. Native Host still holds the session in memory → rejects new connections
 *   5. Chrome's service worker is terminated after 30s idle → scheduleReconnect timer dies
 *
 * Three failure scenarios this tool handles:
 *   A. Native Host process is alive but port is dead (zombie)
 *   B. Native Host process is dead, port is free, Chrome SW needs a nudge to respawn it
 *   C. Claude Code's connection memoize cache holds a stale "failed" Client
 *
 * Fix:
 *   1. Kill any zombie Node process on port 12306
 *   2. Wait briefly for Chrome's onDisconnect → scheduleReconnect to fire
 *   3. If Chrome doesn't respawn it, reload the extension via CDP or instruct manual action
 *   4. Verify connection with actual MCP SDK (same as Claude Code uses)
 */
import { spawn, execSync } from 'node:child_process'
import { createConnection } from 'node:net'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { homedir } from 'node:os'

const PORT = 12306
const MCP_URL = `http://127.0.0.1:${PORT}/mcp`
const CDP_URL = 'http://127.0.0.1:9222'

// Native Host path discovery (from Chrome's NativeMessagingHosts manifest)
function findNativeHostPath() {
  const candidates = [
    // Standard npm global path
    join(homedir(), 'AppData/Roaming/npm/node_modules/mcp-chrome-bridge/dist/run_host.bat'),
    // Alternative install locations
    join(homedir(), 'AppData/Roaming/npm/node_modules/mcp-chrome-bridge/dist/index.js'),
    'C:/Users/Administrator/AppData/Roaming/npm/node_modules/mcp-chrome-bridge/dist/run_host.bat',
    'C:/Users/Administrator/AppData/Roaming/npm/node_modules/mcp-chrome-bridge/dist/index.js',
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

// Chrome Native Messaging Host manifest path
function findNativeHostManifest() {
  const candidates = [
    join(homedir(), 'AppData/Roaming/Google/Chrome/NativeMessagingHosts/com.chromemcp.nativehost.json'),
    join(homedir(), 'AppData/Local/Google/Chrome/User Data/NativeMessagingHosts/com.chromemcp.nativehost.json'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

// ─── helpers ──────────────────────────────────────────────────────────

function log(tag, msg) {
  const ts = new Date().toLocaleTimeString()
  console.log(`[${ts}] ${tag} ${msg}`)
}

function isPortFree() {
  return new Promise((resolve) => {
    const sock = createConnection(PORT, '127.0.0.1')
    sock.on('connect', () => { sock.destroy(); resolve(false) })
    sock.on('error', () => { sock.destroy(); resolve(true) })
  })
}

function getPortPID() {
  try {
    const out = execSync(`netstat -ano | findstr ":${PORT}"`, { encoding: 'utf8' })
    const lines = out.split('\n').filter((l) => l.includes('LISTENING'))
    if (lines.length === 0) return null
    const pid = lines[0].trim().split(/\s+/).pop()
    return pid ? Number(pid) : null
  } catch {
    return null
  }
}

function getProcessName(pid) {
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' })
    const line = out.split('\n').find((l) => l.trim())
    if (!line) return 'unknown'
    return line.split(',')[0].replace(/"/g, '').trim()
  } catch {
    return 'unknown'
  }
}

function killPID(pid) {
  try {
    execSync(`taskkill //F //PID ${pid}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Step 3b: Directly spawn Native Host (bypass Chrome) ────────────
//
// The Native Host normally receives a `{type:"START", payload:{port}}` message
// from Chrome via the Native Messaging protocol (4-byte length prefix + JSON on stdin).
// When spawning it directly, we reproduce that: launch run_host.bat, grab its stdin,
// and write the START message ourselves. The HTTP MCP server on 12306 will then
// come up — the same endpoint Claude Code talks to. Chrome only needs to be
// alive for browser tool execution (CDP via Playwright), not for the MCP endpoint.
async function startNativeHost() {
  const hostPath = findNativeHostPath()
  if (!hostPath) {
    log('SPAWN', 'Could not find mcp-chrome-bridge run_host.bat — not installed?')
    return null
  }

  // Resolve node + the actual JS script (index.js in same dir as run_host.bat)
  const hostDir = resolve(hostPath, '..')
  const indexJs = join(hostDir, 'index.js')
  let nodeExe = process.execPath

  // node_path.txt takes priority per the bat logic
  const nodePathFile = join(hostDir, 'node_path.txt')
  if (existsSync(nodePathFile)) {
    const p = readFileSync(nodePathFile, 'utf8').trim()
    if (existsSync(p)) nodeExe = p
  }

  if (!existsSync(indexJs)) {
    log('SPAWN', `index.js not found at ${indexJs}`)
    return null
  }

  // Native Messaging protocol: 4-byte LE length prefix + JSON body.
  const msg = JSON.stringify({ type: 'start', payload: { port: PORT } })
  const msgBuf = Buffer.from(msg, 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(msgBuf.length, 0)
  const frame = Buffer.concat([header, msgBuf])

  // Strategy: this script spawns NH directly as a child process with piped stdin,
  // writes the NM frame to stdin, and then stays alive indefinitely as the
  // pipe-holder. NH needs: (1) the NM START frame on stdin to bind HTTP,
  // (2) an open stdin pipe (= no EOF) so it doesn't self-exit.
  //
  // Why not spawn a detached grandchild? On Windows, bash-inherited job objects
  // kill any process whose parent script exits, including "detached" ones.
  // The only reliable way to keep NH alive is for this very script to live.
  // The user Ctrl+C's this script when Claude Code is connected — at which point
  // Claude Code's own StreamableHTTP transport keeps NH alive via the MCP session.

  log('SPAWN', `Spawning NH directly: ${nodeExe} ${indexJs}`)

  const nh = spawn(nodeExe, [indexJs], {
    stdio: ['pipe', 'inherit', 'inherit'],
    detached: false,
    windowsHide: true,
  })

  nh.on('error', (err) => log('SPAWN', `NH spawn error: ${err.message}`))
  nh.on('exit', (code, sig) => {
    log('SPAWN', `⚠️ NH exited code=${code} sig=${sig}`)
    // If NH dies unexpectedly, restart it after a brief delay
    setTimeout(() => restartNativeHost(hostDir), 2000)
  })

  nh.stdin.write(frame)
  log('SPAWN', `NH PID=${nh.pid}, frame written — keeping stdin pipe open`)

  // Return the nh child handle so caller can track it (or wait on it)
  return nh
}

// Restart NH (called when it exits unexpectedly)
async function restartNativeHost(hostDir) {
  const indexJs = join(hostDir, 'index.js')
  let nodeExe = process.execPath
  const nodePathFile = join(hostDir, 'node_path.txt')
  if (existsSync(nodePathFile)) {
    const p = readFileSync(nodePathFile, 'utf8').trim()
    if (existsSync(p)) nodeExe = p
  }

  log('SPAWN', `Restarting NH...`)
  const msg = JSON.stringify({ type: 'start', payload: { port: PORT } })
  const msgBuf = Buffer.from(msg, 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32LE(msgBuf.length, 0)
  const frame = Buffer.concat([header, msgBuf])

  const nh = spawn(nodeExe, [indexJs], {
    stdio: ['pipe', 'inherit', 'inherit'],
    detached: false,
    windowsHide: true,
  })
  nh.on('error', (err) => log('SPAWN', `NH spawn error: ${err.message}`))
  nh.on('exit', (code, sig) => {
    if (code !== 0) setTimeout(() => restartNativeHost(hostDir), 2000)
  })
  nh.stdin.write(frame)
  log('SPAWN', `NH restarted PID=${nh.pid}`)
  return nh
}

// Keep the event loop alive indefinitely — this process is the NH pipe-holder.
// NH survives because its stdin pipe (this process → NH) stays open.
// When user Ctrl+C's, they take NH with them — but that's OK because
// Claude Code's keepalive pings (every ~30s via StreamableHTTP) will restart NH
// via the MCP reconnection flow.
function holdForever() {
  return new Promise((resolve) => {
    process.on('SIGINT', () => {
      log('HOLD', 'Received SIGINT — exiting. NH will self-terminate (expected).')
      resolve()
    })
  })
}

// ─── Step 1: diagnose current state ──────────────────────────────────

async function diagnose() {
  log('DIAG', `Checking port ${PORT}...`)
  const pid = getPortPID()
  const free = await isPortFree()

  if (free) {
    log('DIAG', `Port ${PORT} is FREE (no listener)`)
    return { state: 'free', pid: null }
  }

  const name = getProcessName(pid)
  log('DIAG', `Port ${PORT} is OCCUPIED by PID ${pid} (${name})`)

  // Try a quick MCP health check
  try {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
    const client = new Client({ name: 'recover-diag', version: '1.0.0' }, { capabilities: {} })
    await client.connect(transport)
    const { tools } = await client.listTools()
    log('DIAG', `✅ MCP server healthy — ${tools.length} tools available`)
    // Terminate the session so NH doesn't hold it for our probe client
    try { await transport.terminateSession() } catch {}
    await client.close()
    return { state: 'healthy', pid }
  } catch (err) {
    log('DIAG', `❌ MCP probe failed: ${err.message?.slice(0, 100)}`)
    return { state: 'zombie', pid, error: err.message }
  }
}

// ─── Step 2: terminate zombie process ────────────────────────────────

async function killZombie(pid) {
  const name = getProcessName(pid)
  log('KILL', `Terminating PID ${pid} (${name}) on port ${PORT}...`)
  const ok = killPID(pid)
  if (ok) {
    log('KILL', `✅ Killed PID ${pid}`)
  } else {
    log('KILL', `⚠️ Could not kill PID ${pid}`)
  }
  // Wait for port to release
  for (let i = 0; i < 10; i++) {
    await sleep(300)
    if (await isPortFree()) {
      log('KILL', `Port ${PORT} is now free`)
      return true
    }
  }
  log('KILL', `Port ${PORT} still occupied after kill attempt`)
  return false
}

// ─── Step 3: attempt CDP-based Chrome extension reload ───────────────

async function reloadExtensionViaCDP() {
  log('RELOAD', 'Attempting Chrome extension reload via CDP...')

  try {
    // Fetch CDP targets
    const resp = await fetch(`${CDP_URL}/json/version`)
    if (!resp.ok) throw new Error(`CDP not available on ${CDP_URL}`)
    const info = await resp.json()
    log('RELOAD', `Connected to: ${info.Browser || 'unknown'}`)

    // Open chrome://extensions in a new tab to trigger SW reload
    // The service worker restarts when the extension page gains focus
    const newTabResp = await fetch(`${CDP_URL}/json/new?chrome://extensions`, {
      method: 'PUT',
    })

    log('RELOAD', 'Opened chrome://extensions tab — service worker should restart')
    return true
  } catch (err) {
    log('RELOAD', `CDP reload failed: ${err.message?.slice(0, 80)}`)
    return false
  }
}

// ─── Step 4: wait for Native Host to come back ──────────────────────

async function waitForRecovery(timeoutMs = 30000) {
    log('WAIT', `Waiting up to ${timeoutMs / 1000}s for Native Host to start listening...`)
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      await sleep(2000)

      const free = await isPortFree()
      if (free) {
        log('WAIT', `  ⏳ Port ${PORT} still free...`)
        continue
      }

      // Port is occupied — is it a real MCP server?
      let transport = null
      let client = null
      try {
        transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
        client = new Client({ name: 'recover-wait', version: '1.0.0' }, { capabilities: {} })
        await client.connect(transport)
        const { tools } = await client.listTools()
        log('WAIT', `✅ MCP server RECOVERED — ${tools.length} tools available`)
        // CRITICAL: SDK close() does NOT call terminateSession(). Without the DELETE,
        // NH holds the session in memory and rejects all future connections with
        // "Already connected to a transport". Must DELETE first, then close.
        try {
          await transport.terminateSession()
          log('WAIT', '  Session terminated via DELETE — NH ready for new clients')
        } catch (e) {
          log('WAIT', `  ⚠️ terminateSession failed: ${e.message?.slice(0, 60)}`)
        }
        await client.close()
        return true
      } catch (err) {
        // If the probe itself failed because of a stale session, try to clean up
        if (transport && err.message?.includes('Already connected')) {
          try { await transport.terminateSession() } catch {}
        }
        if (client) try { await client.close() } catch {}
        log('WAIT', `  ⏳ Port up but MCP not ready yet: ${err.message?.slice(0, 60)}`)
        continue
      }
    }

    log('WAIT', `❌ Timeout — Native Host did not come back within ${timeoutMs / 1000}s`)
    return false
  }

// ─── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60))
  console.log('  chrome-mcp-server Recovery Tool')
  console.log('═'.repeat(60) + '\n')

  const diag = await diagnose()

  switch (diag.state) {
    case 'healthy':
      console.log('\n🌟 chrome-mcp-server is already healthy. No recovery needed.')
      process.exit(0)

    case 'free': {
      // Port is free — Chrome's SW may respawn the Native Host, or we nudge it
      log('RECOVER', 'Port is free. Attempting Chrome-native recovery...')

      // Step A: Wait — sometimes scheduleReconnect fires on its own
      const freeRecoveredA = await waitForRecovery(5000)
      if (freeRecoveredA) {
        console.log('\n🌟 Recovery successful — Chrome respawned Native Host.')
        process.exit(0)
      }

      // Step B: Try CDP-based extension reload
      const freeReloaded = await reloadExtensionViaCDP()
      if (freeReloaded) {
        const freeRecoveredB = await waitForRecovery(15000)
        if (freeRecoveredB) {
          console.log('\n🌟 Recovery successful via CDP reload.')
          process.exit(0)
        }
      }

      // Step C: Last resort — spawn Native Host directly (this script becomes pipe-holder)
      log('RECOVER', 'Chrome did not auto-recover. Starting Native Host directly...')
      const freeSpawned = await startNativeHost()
      if (freeSpawned) {
        const freeRecoveredC = await waitForRecovery(15000)
        if (freeRecoveredC) {
          console.log('\n🌟 Recovery successful — Native Host started directly.')
          console.log('   This process is keeping NH alive. Press Ctrl+C to release NH.')
          console.log('   Claude Code\'s MCP session will keep NH alive after you disconnect.')
          await holdForever()
          return
        }
      }
      log('FATAL', 'Native Host launch reported success but MCP endpoint did not come up.')
      log('FATAL', 'Check NH stderr (shown above) for the cause.')

      break
    }

    case 'zombie': {
      log('RECOVER', 'Zombie Native Host detected. Killing...')
      const killed = await killZombie(diag.pid)
      if (!killed) {
        log('FATAL', 'Could not kill zombie process. Manual intervention required.')
        break
      }

      // Step A: Wait for Chrome's onDisconnect → scheduleReconnect
      const zombieRespawned = await waitForRecovery(8000)
      if (zombieRespawned) {
        console.log('\n🌟 Recovery successful — Chrome respawned Native Host.')
        process.exit(0)
      }

      // Step B: Try CDP reload to wake Chrome's SW
      await reloadExtensionViaCDP()
      const zombieRecoveredB = await waitForRecovery(15000)
      if (zombieRecoveredB) {
        console.log('\n🌟 Recovery successful via CDP reload.')
        process.exit(0)
      }

      // Step C: Spawn Native Host directly (this script becomes pipe-holder)
      log('RECOVER', 'Chrome did not recover. Starting Native Host directly...')
      const zombieSpawned = await startNativeHost()
      if (zombieSpawned) {
        const zombieRecoveredC = await waitForRecovery(15000)
        if (zombieRecoveredC) {
          console.log('\n🌟 Recovery successful — Native Host started directly.')
          console.log('   This process is keeping NH alive. Press Ctrl+C to release NH.')
          console.log('   Claude Code\'s MCP session will keep NH alive after you disconnect.')
          await holdForever()
          return
        }
      }
      log('FATAL', 'Native Host launch reported success but MCP endpoint did not come up.')
      log('FATAL', 'Check NH stderr (shown above) for the cause.')

      break
    }
  }

  // ─── All automatic recovery failed ─────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log('  ❌ Automatic recovery FAILED')
  console.log('═'.repeat(60))
  console.log(`
  Manual recovery steps:

  1. Open Chrome and navigate to chrome://extensions
  2. Find "Chrome MCP Server" (extension ID: hbdgbgagpkpjffpklnamcljpakneikee)
  3. Click the 🔄 Reload button
  4. Close ALL tabs that have the chrome-mcp-server companion open
  5. Wait 5 seconds for the Native Host to relaunch
  6. Run this script again to verify: node recover-chrome-mcp.mjs

  If that still fails:
     a. Close Chrome entirely (check taskbar for background process)
     b. Run this script once more (it will spawn Native Host directly)
     c. Still failing? Reinstall mcp-chrome-bridge:
        > npm install -g mcp-chrome-bridge
`)
  process.exit(1)
}

main().catch((err) => {
  console.error('\n[FATAL]', err)
  process.exit(1)
})
