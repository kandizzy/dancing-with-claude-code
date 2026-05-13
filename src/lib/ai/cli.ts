import { spawn } from 'node:child_process'

const TIMEOUT_MS = 120_000

export class ClaudeCliError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ClaudeCliError'
  }
}

/**
 * Spawn `claude -p` (non-interactive print mode), feed it the system + user prompts
 * via stdin (separated by `---`), and return its stdout.
 *
 * Single-turn, buffered. No streaming, no conversation state. `claude` reads
 * ./CLAUDE.md and ./.claude/commands/ from the spawned process's cwd, so the
 * caller should set `cwd` to the project root they want Claude to operate in.
 *
 * Lifted from the possible-futures pattern. The CLI has no --system flag, so the
 * prompts are concatenated; the `---` is a convention.
 */
export async function claudeCli(
  systemPrompt: string,
  userPrompt: string,
  options: { cwd?: string } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p'], {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, TERM: 'dumb' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const settle = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      action()
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      settle(() =>
        reject(new ClaudeCliError(`claude CLI timed out after ${TIMEOUT_MS / 1000}s`)),
      )
    }, TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        settle(() =>
          reject(
            new ClaudeCliError(
              'claude CLI not found on PATH. Install with: npm install -g @anthropic-ai/claude-code',
              err,
            ),
          ),
        )
        return
      }
      settle(() => reject(new ClaudeCliError(`claude CLI failed to start: ${err.message}`, err)))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        settle(() =>
          reject(
            new ClaudeCliError(
              `claude CLI exited with code ${code}${stderr ? `:\n${stderr.trim()}` : ''}`,
            ),
          ),
        )
        return
      }
      const trimmed = stdout.trim()
      if (!trimmed) {
        settle(() => reject(new ClaudeCliError('claude CLI returned empty output')))
        return
      }
      settle(() => resolve(trimmed))
    })

    // Concatenate the prompts and pipe them through stdin to avoid argv length limits.
    child.stdin.end(`${systemPrompt}\n\n---\n\n${userPrompt}`)
  })
}
