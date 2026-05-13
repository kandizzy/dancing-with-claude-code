import Anthropic from '@anthropic-ai/sdk'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

export class ClaudeApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ClaudeApiError'
  }
}

/**
 * Call Claude via the Anthropic SDK. Server-side only. Used in API mode (deployed
 * Vercel preview) where we can't spawn the CLI.
 *
 * Because API mode has no filesystem access, this bridge reads ./CLAUDE.md and
 * ./.claude/commands/*.md server-side and embeds them in the system prompt so the
 * API mode replies are grounded in the same project context the CLI sees natively.
 */
export async function claudeApi(
  systemPrompt: string,
  userPrompt: string,
  options: { model?: string; cwd?: string } = {},
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ClaudeApiError(
      'ANTHROPIC_API_KEY is not set. Set it in your environment (or Vercel project settings).',
    )
  }
  const client = new Anthropic({ apiKey })

  const cwd = options.cwd ?? process.cwd()
  const context = await loadProjectContext(cwd)
  const fullSystem = `${context}\n\n${systemPrompt}`.trim()

  try {
    const result = await client.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: fullSystem,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = result.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')

    const trimmed = text.trim()
    if (!trimmed) throw new ClaudeApiError('Anthropic SDK returned no text content')
    return trimmed
  } catch (err) {
    if (err instanceof ClaudeApiError) throw err
    throw new ClaudeApiError(
      err instanceof Error ? err.message : 'Anthropic SDK call failed',
      err,
    )
  }
}

// Mirror what `claude` sees natively from cwd: CLAUDE.md and any .claude/commands/*.md.
// Embedded between markers so the model knows where the project context ends.
async function loadProjectContext(cwd: string): Promise<string> {
  const parts: string[] = []
  try {
    const md = await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8')
    parts.push(`---- BEGIN CLAUDE.md ----\n${md.trim()}\n---- END CLAUDE.md ----`)
  } catch {
    /* no CLAUDE.md — that's fine */
  }
  try {
    const dir = path.join(cwd, '.claude', 'commands')
    const entries = await readdir(dir)
    const cmds: string[] = []
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue
      const raw = await readFile(path.join(dir, entry), 'utf8')
      const name = entry.replace(/\.md$/, '')
      cmds.push(`/${name}\n${raw.trim()}`)
    }
    if (cmds.length > 0) {
      parts.push(`---- BEGIN slash commands ----\n${cmds.join('\n\n')}\n---- END slash commands ----`)
    }
  } catch {
    /* no commands dir — that's fine */
  }
  return parts.join('\n\n')
}
