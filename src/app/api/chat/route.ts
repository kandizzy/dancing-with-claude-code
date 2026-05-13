import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'

const apiKey = process.env.ANTHROPIC_API_KEY

export async function POST(req: Request) {
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 501 })
  }

  const { model, messages } = await req.json()
  const client = new Anthropic({ apiKey })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const messageStream = client.messages.stream({
        model,
        max_tokens: 8096,
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
