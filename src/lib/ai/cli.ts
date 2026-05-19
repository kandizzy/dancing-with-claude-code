import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk'

export class ClaudeCliError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'ClaudeCliError'
  }
}

export type ClaudeCliResult = {
  text: string
  // The session ID the SDK assigned to this exchange (whether newly created or resumed).
  // Pass it back on the next call via `resumeSessionId` and the same conversation continues
  // with full context. Persistence is server-side per-session-ID; the client just holds the ID.
  sessionId: string | null
}

// Applied on top of every caller's system prompt. The Claude Code preset is designed to
// verbalize its agent loop — "I'll search for X first", "TodoWrite isn't useful here",
// "I already have these files loaded" — which is right for developer tooling but wrong for
// this teaching surface, where a confused student reads that monologue as more vocabulary
// they're supposed to know. This preamble strips it.
const TEACHING_SURFACE_PREAMBLE = `You are answering inside a browser-based teaching tool for Claude Code. The user is a student, not a developer watching your agent loop.

Do not narrate your tool use. Do not announce which files you've already read or plan to read. Do not announce that a task list ("TodoWrite") is unnecessary. Do not preface answers with meta-commentary about what you're about to do. Just answer the user directly, the way a thoughtful collaborator would in conversation. If you read files to ground your answer, that's fine — cite specific facts you found, but do not narrate the act of reading.`

export type ClaudeCliOptions = {
  cwd?: string
  resumeSessionId?: string | null
  allowedTools?: ReadonlyArray<string>
  /**
   * Whether to use the Claude Code system-prompt preset. The preset is a few
   * thousand tokens of agent-loop scaffolding (TodoWrite, file traversal,
   * sub-agent planning) prepended to every request. Worth it when the figure
   * actually uses tools (figure 5's Edit/Write step); pure overhead when the
   * figure is doing text-only Q&A (figures 1, 2, 3, 4).
   *
   * Default false. Figure 5 opts in by passing true.
   */
  useClaudeCodePreset?: boolean
  /**
   * Whether to read CLAUDE.md and .claude/commands/ from cwd on every call.
   * The contents of those files get prepended to the prompt, so this is the
   * other big lever on token cost. Figures 1 and 2 need it (CLAUDE.md is
   * the lesson; slash commands live in .claude/commands/). Figures 3, 4, 5
   * don't need it and can save the tokens by skipping it.
   *
   * Default false.
   */
  loadProjectContext?: boolean
}

/**
 * Run a turn against Claude via the Agent SDK.
 *
 * Multi-turn conversations are handled natively: capture the `sessionId` from the result,
 * pass it as `resumeSessionId` on the next call, and Claude sees the full prior conversation.
 *
 * The SDK reads CLAUDE.md and .claude/commands/ from cwd because we set
 * `settingSources: ['project']` — same project context the interactive `claude` binary
 * would see.
 *
 * Tools are gated per-call via `allowedTools`. By default no tools are exposed — this is a
 * teaching surface, so most figures want Claude to reply with text only, not to execute
 * Edit/Write/Bash mid-walkthrough. Figure 5's run-the-directive step is the exception:
 * it passes ['Edit', 'Write'] because the diff step depends on real file edits.
 */
export async function claudeCli(
  systemPrompt: string,
  userPrompt: string,
  options: ClaudeCliOptions = {},
): Promise<ClaudeCliResult> {
  const usePreset = options.useClaudeCodePreset === true
  const loadProject = options.loadProjectContext === true
  try {
    const iterator = query({
      prompt: userPrompt,
      options: {
        // System prompt construction: with the Claude Code preset (figure 5), we
        // append the teaching preamble + caller text. Without the preset (most
        // figures), we pass a clean custom system prompt — saves thousands of
        // tokens per call. The teaching preamble is still included as a leading
        // instruction because it suppresses the narration habit even outside the
        // preset.
        systemPrompt: usePreset
          ? {
              type: 'preset',
              preset: 'claude_code',
              append: `${TEACHING_SURFACE_PREAMBLE}\n\n${systemPrompt}`,
            }
          : `${TEACHING_SURFACE_PREAMBLE}\n\n${systemPrompt}`,
        // Project context (CLAUDE.md, .claude/commands/) is opt-in. Figures 1
        // and 2 need it because the lesson IS the file or the commands. Others
        // pay tokens for nothing if they enable it.
        ...(loadProject ? { settingSources: ['project' as const] } : {}),
        cwd: options.cwd ?? process.cwd(),
        ...(options.resumeSessionId ? { resume: options.resumeSessionId } : {}),
        ...(options.allowedTools && options.allowedTools.length > 0
          ? { allowedTools: [...options.allowedTools] }
          : {}),
      },
    })

    let text = ''
    let sessionId: string | null = null

    for await (const msg of iterator as AsyncIterable<SDKMessage>) {
      // System init carries the session_id right away — capture it eagerly in case the
      // run errors out before the final result message.
      if (msg.type === 'system' && 'session_id' in msg) {
        sessionId = (msg as unknown as { session_id: string }).session_id ?? sessionId
      }
      if (msg.type === 'assistant') {
        const content = (msg as { message: { content: Array<{ type: string; text?: string }> } })
          .message.content
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            text += block.text
          }
        }
      }
      if (msg.type === 'result') {
        const r = msg as unknown as {
          session_id?: string
          subtype?: string
          is_error?: boolean
          result?: string
        }
        if (r.session_id) sessionId = r.session_id
        if (r.is_error) {
          throw new ClaudeCliError(
            `Claude Agent SDK returned an error result${r.result ? `: ${r.result}` : ''}`,
          )
        }
        // If we never accumulated assistant text but the result has one, take it.
        if (!text.trim() && typeof r.result === 'string') text = r.result
      }
    }

    const trimmed = text.trim()
    if (!trimmed) {
      throw new ClaudeCliError('Claude Agent SDK returned no text content')
    }
    return { text: trimmed, sessionId }
  } catch (err) {
    if (err instanceof ClaudeCliError) throw err
    const message = err instanceof Error ? err.message : 'Claude Agent SDK call failed'
    throw new ClaudeCliError(message, err)
  }
}
