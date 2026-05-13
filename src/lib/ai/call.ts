import { claudeApi } from './api'
import { claudeCli } from './cli'

export type AiMode = 'cli' | 'api'

export type AiCallResult = {
  text: string
  mode: AiMode
}

export type AiCallInput = {
  mode: AiMode
  systemPrompt: string
  userPrompt: string
  cwd?: string
  model?: string
}

/**
 * One dispatcher for the prototype's two AI modes. Same input/output shape regardless
 * of backend; callers don't need to know which ran.
 *
 * - `cli`: spawns local `claude` against a real on-disk codebase. Tool calls run.
 * - `api`: calls the Anthropic SDK. No tool calls, no file edits — system prompt
 *   should already embed any project context the caller wants Claude to see.
 */
export async function callAi(input: AiCallInput): Promise<AiCallResult> {
  switch (input.mode) {
    case 'cli': {
      const text = await claudeCli(input.systemPrompt, input.userPrompt, { cwd: input.cwd })
      return { text, mode: 'cli' }
    }
    case 'api': {
      const text = await claudeApi(input.systemPrompt, input.userPrompt, { model: input.model })
      return { text, mode: 'api' }
    }
  }
}
