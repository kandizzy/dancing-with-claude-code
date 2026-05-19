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
  // Tools to allow the SDK to call. Defaults to none (text-only). Figure 5's run step
  // passes ['Edit', 'Write'] so Claude can actually modify files on the branch.
  allowedTools?: ReadonlyArray<string>
  // Whether to use the Claude Code system-prompt preset. See ClaudeCliOptions
  // for the cost tradeoff. Default false.
  useClaudeCodePreset?: boolean
  // Whether to load CLAUDE.md and .claude/commands/ from cwd. See
  // ClaudeCliOptions for the cost tradeoff. Default false.
  loadProjectContext?: boolean
}

/**
 * If the SDK returns the assistant's reply wrapped in a JSON envelope
 * (e.g. `{"text": "...", "sessionId": "..."}` as a literal string), unwrap
 * one layer. Observed in the wild during the May 2026 Anthropic 529 events:
 * the SDK's error path packaged its own envelope into the text field, and
 * that wrapped string ended up rendered in the chat as the assistant's reply.
 *
 * Detected heuristically: text that starts with `{`, ends with `}`, parses
 * as JSON, and has a `text` field of its own.
 *
 * Defensive only. If the unwrap doesn't apply, return the original text
 * untouched. Generic JSON that isn't shaped like our result envelope (no
 * `text` field) is also left alone — we don't want to eat Claude's legitimate
 * JSON-flavored answers.
 */
function unwrapJsonEnvelope(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return raw
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (
      typeof parsed === 'object' &&
      parsed != null &&
      'text' in parsed &&
      typeof (parsed as { text: unknown }).text === 'string'
    ) {
      return (parsed as { text: string }).text
    }
  } catch {
    // Not valid JSON — leave the original alone.
  }
  return raw
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
    allowedTools: input.allowedTools,
    useClaudeCodePreset: input.useClaudeCodePreset,
    loadProjectContext: input.loadProjectContext,
  })
  return {
    text: unwrapJsonEnvelope(result.text),
    ...(result.sessionId ? { sessionId: result.sessionId } : {}),
  }
}
