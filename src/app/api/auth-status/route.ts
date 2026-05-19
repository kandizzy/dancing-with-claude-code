import { spawn } from 'node:child_process'

export const runtime = 'nodejs'

// How Claude is authenticated on the machine running the dev server. Three configurations:
//   1. ANTHROPIC_API_KEY set         → hasApiKey true  (calls billed to that key)
//   2. no key, `claude` CLI present  → hasApiKey false, hasCli true (billed to the CLI login)
//   3. neither                       → both false (chat will error)
// The client renders ApiKeyNotice off this. Mirrors the AuthStatus type in lib/ai/client.ts.

// Probe the `claude` binary by running `claude --version`. Resolves to the trimmed version
// string on success, or null if the binary isn't on PATH / exits non-zero.
function probeCliVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>
    try {
      child = spawn('claude', ['--version'], {
        env: { ...process.env, TERM: 'dumb' },
      })
    } catch {
      resolve(null)
      return
    }
    let out = ''
    const done = (v: string | null) => resolve(v)
    // Guard against a hang — if `claude --version` doesn't return promptly, treat as absent.
    const timer = setTimeout(() => {
      child.kill()
      done(null)
    }, 5000)
    child.stdout?.on('data', (b: Buffer) => {
      out += b.toString('utf8')
    })
    child.on('error', () => {
      clearTimeout(timer)
      done(null)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      done(code === 0 && out.trim() ? out.trim() : null)
    })
  })
}

export async function GET() {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY)
  const cliVersion = await probeCliVersion()
  return Response.json({
    hasApiKey,
    hasCli: cliVersion != null,
    cliVersion,
  })
}
