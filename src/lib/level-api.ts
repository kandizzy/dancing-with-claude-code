export type LevelMessage = { role: 'user' | 'assistant'; content: string }

export async function streamLevelChat(
  levelId: number,
  history: LevelMessage[],
  claudeMd: string,
  onDelta: (chunk: string) => void,
  options?: { model?: string; signal?: AbortSignal; extraSystem?: string },
): Promise<string> {
  const res = await fetch('/api/level-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      levelId,
      messages: history,
      claudeMd,
      model: options?.model,
      extraSystem: options?.extraSystem,
    }),
    signal: options?.signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(`Level chat request failed: ${res.status}`)
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
