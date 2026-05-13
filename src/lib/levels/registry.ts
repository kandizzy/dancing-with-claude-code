import type { ClaudeMdState, LevelDefinition, LevelId, UserEntry } from './types'
import { level1 } from './level-1'
import { level2 } from './level-2'
import { level3 } from './level-3'
import { level4 } from './level-4'
import { level5 } from './level-5'

export const LEVELS: Record<LevelId, LevelDefinition> = {
  1: level1,
  2: level2,
  3: level3,
  4: level4,
  5: level5,
}

export function getLevel(id: number): LevelDefinition | null {
  if (id < 1 || id > 5) return null
  return LEVELS[id as LevelId] ?? null
}

export function assembleSystemPrompt(state: ClaudeMdState, extra?: string): string {
  const behaviorBlock = state.behavior.length
    ? state.behavior.map((rule) => `- ${rule}`).join('\n')
    : '- (none specified)'
  const notesBlock = state.userEntries.length
    ? state.userEntries.map((e) => `- ${e.text}`).join('\n')
    : '- (the user has not pinned any notes yet)'

  const base = `You are Claude, helping a user explore a browser-based computer vision playground. The user's project has a CLAUDE.md attached. Treat it as authoritative project context.

# Project (read-only context)
${state.stack}

# How you behave on this project
${behaviorBlock}

# Notes the user has pinned for you
${notesBlock}

When the user's pinned notes are relevant to a question, draw on them directly — prefer them over generic best practice. They have decided these matter for this project. Quote or paraphrase pinned notes when you use them so the user can see their guidance taking effect. Keep replies short (1–3 short paragraphs).`

  return extra ? `${base}\n\n${extra}` : base
}

export function findUserEntryMatch(reply: string, entries: UserEntry[]): UserEntry | null {
  const normReply = normalize(reply)
  for (const entry of entries) {
    if (entryMatches(entry.text, normReply)) return entry
  }
  return null
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function entryMatches(entryText: string, normReply: string): boolean {
  const norm = normalize(entryText)
  if (norm.length < 12) return false
  if (normReply.includes(norm)) return true
  const words = norm.split(' ')
  if (words.length < 4) return false
  for (let i = 0; i + 4 <= words.length; i++) {
    const slice = words.slice(i, i + 4).join(' ')
    if (normReply.includes(slice)) return true
  }
  return false
}
