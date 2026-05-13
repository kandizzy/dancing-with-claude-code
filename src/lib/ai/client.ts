// Client-side helpers for talking to the local /api/ai route.

import type { AiCallResult, AiMode } from './call'

export type ClientAiInput = {
  systemPrompt: string
  userPrompt: string
  mode?: AiMode
  model?: string
}

export async function ask(input: ClientAiInput): Promise<AiCallResult> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = (await res.json()) as AiCallResult | { error: string; mode?: AiMode }
  if (!res.ok || 'error' in body) {
    const msg = 'error' in body ? body.error : `request failed: ${res.status}`
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
