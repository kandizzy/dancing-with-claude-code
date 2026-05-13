import type { Message } from './types'
import { CANNED_RESPONSE, DEFAULT_CONFIG } from './seed'

export type Model = {
  id: string
  label: string
}

export const MODELS: Model[] = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
]

export const DEFAULT_MODEL = MODELS[1]

/**
 * Stream a chat completion. Calls `onDelta` for each text chunk and resolves
 * with the full assistant text.
 *
 * Posts to the /api/chat route handler which calls Anthropic server-side.
 * Falls back to a simulated canned response when the server has no API key
 * configured, so the scaffold works out of the box.
 */
export async function streamChat(
  history: Message[],
  model: Model,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model.id,
      messages: history.map((m) => ({ role: m.role, content: m.text })),
    }),
    signal,
  })

  if (res.status === 501) {
    return simulate(onDelta, signal)
  }

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status}`)
  }

  let full = ''
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      full += value
      onDelta(value)
    }
  } finally {
    reader.releaseLock()
  }
  return full
}

async function simulate(onDelta: (chunk: string) => void, signal?: AbortSignal): Promise<string> {
  await delay(DEFAULT_CONFIG.thinkingDelay, signal)

  let full = ''
  for (const char of CANNED_RESPONSE) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    full += char
    onDelta(char)
    await delay(DEFAULT_CONFIG.streamSpeed)
  }
  return full
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
