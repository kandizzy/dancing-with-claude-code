import Anthropic from '@anthropic-ai/sdk'
import { assembleSystemPrompt, getLevel } from '@/lib/levels/registry'

export const runtime = 'edge'

const apiKey = process.env.ANTHROPIC_API_KEY

type Body = {
  levelId: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  claudeMd: string
  model?: string
  extraSystem?: string
}

export async function POST(req: Request) {
  const { levelId, messages, claudeMd, model, extraSystem } = (await req.json()) as Body
  const level = getLevel(levelId)
  if (!level) {
    return new Response(`Unknown level: ${levelId}`, { status: 400 })
  }
  if (typeof claudeMd !== 'string') {
    return new Response('Missing CLAUDE.md state', { status: 400 })
  }

  const systemPrompt = assembleSystemPrompt(claudeMd, extraSystem)

  if (!apiKey) {
    const generic = `I would normally read the project's CLAUDE.md to answer specifically — but the server here doesn't have an ANTHROPIC_API_KEY configured. Set it in your environment (or your Vercel project settings) and ask again.`
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
        system: systemPrompt,
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
