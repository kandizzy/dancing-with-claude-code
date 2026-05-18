// Client-side helpers for talking to the local /api/ai route.

import type { AiCallResult } from './call'

export type ClientAiInput = {
  systemPrompt: string
  userPrompt: string
  // The session ID from a prior `ask()` response. Pass it back and the Agent SDK continues
  // the same conversation with full context. Omit for a fresh start (or for single-shot
  // callers that have no conversation to thread).
  sessionId?: string | null
  // Tools to allow the SDK to call. Defaults to none (text-only). Figure 5's run step
  // passes ['Edit', 'Write'] so Claude can actually edit files on the branch.
  allowedTools?: ReadonlyArray<string>
}

/**
 * Subclass for the specific case of Anthropic platform overload (HTTP 529).
 * Caught by UI surfaces so they can render a calmer "API is busy, try again"
 * affordance with a retry button instead of a red technical-error banner.
 *
 * Detected heuristically because the SDK wraps the raw 529 in a string — we
 * look for "529" or "overloaded" (case-insensitive) in the message. The
 * pattern is stable enough across SDK versions for this to be safe; if it
 * stops matching, the caller falls back to the generic error path, which is
 * the prior behavior.
 */
export class OverloadedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OverloadedError'
  }
}

/** True if the given error looks like an Anthropic 529 overload. */
export function isOverloadedError(err: unknown): boolean {
  if (err instanceof OverloadedError) return true
  if (!(err instanceof Error)) return false
  const m = err.message.toLowerCase()
  return m.includes('529') || m.includes('overloaded')
}

export async function ask(input: ClientAiInput): Promise<AiCallResult> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The route handler expects `resumeSessionId`; client-side we call it `sessionId`
    // because callers pass the same field they previously received. Translate here.
    body: JSON.stringify({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      resumeSessionId: input.sessionId,
      allowedTools: input.allowedTools,
    }),
  })
  const body = (await res.json()) as AiCallResult | { error: string }
  if (!res.ok || 'error' in body) {
    const msg = 'error' in body ? body.error : `request failed: ${res.status}`
    // Promote 529 / overload messages to a typed subclass so callers can
    // render them specially. Generic errors keep the base Error type.
    if (msg.toLowerCase().includes('529') || msg.toLowerCase().includes('overloaded')) {
      throw new OverloadedError(msg)
    }
    throw new Error(msg)
  }
  return body
}

export type SlashCommand = {
  name: string
  description: string
  body: string
}

export async function listCommands(): Promise<SlashCommand[]> {
  const res = await fetch('/api/commands')
  if (!res.ok) return []
  const body = (await res.json()) as { commands?: SlashCommand[] }
  return body.commands ?? []
}

export async function readClaudeMd(): Promise<string | null> {
  const res = await fetch('/api/claude-md')
  if (!res.ok) return null
  const body = (await res.json()) as { text?: string }
  return typeof body.text === 'string' ? body.text : null
}

export async function writeClaudeMd(text: string): Promise<void> {
  const res = await fetch('/api/claude-md', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to write CLAUDE.md')
  }
}

export async function readDiff(): Promise<string> {
  const res = await fetch('/api/diff')
  if (!res.ok) return ''
  const body = (await res.json()) as { diff?: string }
  return body.diff ?? ''
}

export type GitStatus = { branch: string | null; clean: boolean; available: boolean }

export async function gitStatus(): Promise<GitStatus> {
  const res = await fetch('/api/git')
  if (!res.ok) return { branch: null, clean: false, available: false }
  return (await res.json()) as GitStatus
}

export type GitActionResult = { ok: true } | { ok: false; error: string }

export async function gitAction(
  action: 'branch' | 'merge' | 'discard',
  name: string,
): Promise<GitActionResult> {
  const res = await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, name }),
  })
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || body.ok === false) {
    return { ok: false, error: body.error ?? `git ${action} failed (${res.status})` }
  }
  return { ok: true }
}
