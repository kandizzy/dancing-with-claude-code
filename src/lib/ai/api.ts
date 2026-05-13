import Anthropic from '@anthropic-ai/sdk'

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
 * Vercel preview) where we can't spawn the CLI. No tool-use, no file edits — the
 * caller's system prompt should embed the contents of CLAUDE.md so Claude has
 * project context.
 */
export async function claudeApi(
  systemPrompt: string,
  userPrompt: string,
  options: { model?: string } = {},
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ClaudeApiError(
      'ANTHROPIC_API_KEY is not set. Set it in your environment (or Vercel project settings).',
    )
  }
  const client = new Anthropic({ apiKey })

  try {
    const result = await client.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Concatenate any text blocks in the response.
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
