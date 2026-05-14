import { claudeCli } from './cli'

export type AiCallResult = {
  text: string
  // The Agent SDK's session ID for the conversation. Pass back as `resumeSessionId`
  // on subsequent turns and the SDK threads the full conversation server-side.
  sessionId?: string
}

export type AiCallInput = {
  systemPrompt: string
  userPrompt: string
  // The session to continue. Returned by a previous call's `sessionId`. Omit for a fresh
  // conversation. Single-shot callers (e.g. directive refinement in figures 3 and 5) just
  // never pass one.
  resumeSessionId?: string | null
  cwd?: string
}

/**
 * Run one turn against Claude via the Agent SDK.
 *
 * The prototype runs locally only. Auth comes from `ANTHROPIC_API_KEY` in the dev
 * server's environment, or from an existing `claude` CLI login on the same machine.
 * The SDK reads `CLAUDE.md` and `.claude/commands/` from the working directory
 * natively (we set `settingSources: ['project']` inside `claudeCli`), so the prototype
 * sees the same project context an interactive `claude` session would.
 *
 * Multi-turn conversations are session-backed: capture `sessionId` from the result and
 * pass back as `resumeSessionId` on the next call. There is no separate history array —
 * the SDK is the source of truth for what Claude has seen.
 */
export async function callAi(input: AiCallInput): Promise<AiCallResult> {
  const result = await claudeCli(input.systemPrompt, input.userPrompt, {
    cwd: input.cwd,
    resumeSessionId: input.resumeSessionId,
  })
  return {
    text: result.text,
    ...(result.sessionId ? { sessionId: result.sessionId } : {}),
  }
}
