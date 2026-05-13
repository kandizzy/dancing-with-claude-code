import { callAi, type AiCallInput, type AiMode } from '@/lib/ai/call'

// Node runtime — the CLI bridge uses child_process.spawn, which the edge runtime can't run.
export const runtime = 'nodejs'

type Body = {
  mode?: AiMode
  systemPrompt: string
  userPrompt: string
  model?: string
}

function pickMode(requested: AiMode | undefined): AiMode {
  if (requested) return requested
  // Default by environment: local dev → CLI, anything deployed → API.
  return process.env.NODE_ENV === 'production' ? 'api' : 'cli'
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

  const mode = pickMode(body.mode)

  // CLI mode can't ship to production — it spawns a process on the dev machine.
  if (mode === 'cli' && process.env.NODE_ENV === 'production') {
    return Response.json(
      { error: 'CLI mode is unavailable in production. Use API mode or run locally.' },
      { status: 400 },
    )
  }

  const input: AiCallInput = {
    mode,
    systemPrompt,
    userPrompt,
    model: body.model,
    // CLI uses the dev server's cwd, which is the prototype directory when started via `npm run dev`.
    cwd: process.cwd(),
  }

  try {
    const result = await callAi(input)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callAi failed'
    return Response.json({ error: message, mode }, { status: 500 })
  }
}
