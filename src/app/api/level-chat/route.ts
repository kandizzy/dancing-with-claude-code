import Anthropic from '@anthropic-ai/sdk'
import { getLevel } from '@/lib/levels/registry'

export const runtime = 'edge'

const apiKey = process.env.ANTHROPIC_API_KEY

type Body = {
  levelId: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  model?: string
}

export async function POST(req: Request) {
  const { levelId, messages, model } = (await req.json()) as Body
  const level = getLevel(levelId)
  if (!level) {
    return new Response(`Unknown level: ${levelId}`, { status: 400 })
  }

  if (!apiKey) {
    // No key configured. Return a Claude-shaped answer that is intentionally generic —
    // it does NOT contain any of the level's fingerprints, so the level gate fails
    // honestly and the user sees the nudge. To complete levels, set ANTHROPIC_API_KEY.
    const generic = `I would normally read your project's CLAUDE.md to answer that with specifics — pinned versions, exact paths, hostnames — but the server here doesn't have an ANTHROPIC_API_KEY configured, so I can only give you a general reply.\n\nSet \`ANTHROPIC_API_KEY\` in your environment (or Vercel project settings) and ask again. Then I'll draw on the attached file directly.`
    return new Response(generic, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  }

  const client = new Anthropic({ apiKey })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const messageStream = client.messages.stream({
        model: model ?? 'claude-haiku-4-5',
        max_tokens: 1024,
        system: level.systemPrompt,
        messages,
      })

      messageStream.on('text', (delta) => {
        controller.enqueue(encoder.encode(delta))
      })

      try {
        await messageStream.finalMessage()
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
