import { callAi, type AiCallInput } from '@/lib/ai/call'

// Node runtime — the Agent SDK uses child_process internally, which the edge runtime can't run.
export const runtime = 'nodejs'

type Body = {
  systemPrompt: string
  userPrompt: string
  // Returned by a previous response's `sessionId`. Threads conversation continuity through
  // the Agent SDK. Omit for a fresh start.
  resumeSessionId?: string | null
  // Tool names to allow Claude to call. Defaults to none. Figure 5's run step passes
  // ['Edit', 'Write']. Sanitized server-side so a client can't ask for arbitrary tools.
  allowedTools?: ReadonlyArray<string>
  // Optional. See AiCallInput for cost-tradeoff notes.
  useClaudeCodePreset?: boolean
  loadProjectContext?: boolean
}

function sanitizeSessionId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  // Cheap shape check — the SDK's IDs look like UUIDs. Don't echo arbitrary strings
  // (or worse, prompt-injected fragments) into the SDK's resume parameter.
  if (!/^[a-zA-Z0-9_\-]{8,128}$/.test(trimmed)) return undefined
  return trimmed
}

function sanitizeAllowedTools(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  // Only allow specific known tool names. Anything else gets dropped silently.
  const ALLOWED = new Set(['Edit', 'Write', 'Read', 'Bash', 'Glob', 'Grep'])
  const filtered = raw.filter((t): t is string => typeof t === 'string' && ALLOWED.has(t))
  return filtered.length > 0 ? filtered : undefined
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { systemPrompt, userPrompt } = body
  if (typeof systemPrompt !== 'string' || typeof userPrompt !== 'string') {
    return Response.json(
      { error: 'systemPrompt and userPrompt must be strings' },
      { status: 400 },
    )
  }

  const input: AiCallInput = {
    systemPrompt,
    userPrompt,
    resumeSessionId: sanitizeSessionId(body.resumeSessionId),
    allowedTools: sanitizeAllowedTools(body.allowedTools),
    // Booleans are forwarded only when explicitly true — anything else
    // falls through to the lib's default (false).
    useClaudeCodePreset: body.useClaudeCodePreset === true,
    loadProjectContext: body.loadProjectContext === true,
    // The Agent SDK reads CLAUDE.md and .claude/commands/ from cwd, which is the prototype
    // directory when started via `npm run dev`.
    cwd: process.cwd(),
  }

  try {
    const result = await callAi(input)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callAi failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
