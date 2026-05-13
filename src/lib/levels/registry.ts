import type { ClaudeMdState, LevelDefinition, LevelId, UserEntry } from './types'
import { level1 } from './level-1'

export const LEVELS: Record<LevelId, LevelDefinition | null> = {
  1: level1,
  2: null,
  3: null,
  4: null,
  5: null,
}

export function getLevel(id: number): LevelDefinition | null {
  if (id < 1 || id > 5) return null
  return LEVELS[id as LevelId] ?? null
}

// Build the assembled system prompt from live CLAUDE.md state.
export function assembleSystemPrompt(state: ClaudeMdState): string {
  const behaviorBlock = state.behavior.length
    ? state.behavior.map((rule) => `- ${rule}`).join('\n')
    : '- (none specified)'
  const notesBlock = state.userEntries.length
    ? state.userEntries.map((e) => `- ${e.text}`).join('\n')
    : '- (the user has not pinned any notes yet)'

  return `You are Claude, helping a user explore a browser-based computer vision playground. The user's project has a CLAUDE.md attached. Treat it as authoritative project context.

# Project (read-only context)
${state.stack}

# How you behave on this project
${behaviorBlock}

# Notes the user has pinned for you
${notesBlock}

When the user's pinned notes are relevant to a question, draw on them directly — prefer them over generic best practice. They have decided these matter for this project. Quote or paraphrase pinned notes when you use them so the user can see their guidance taking effect. Keep replies short (1–3 short paragraphs).`
}

// Gate: did Claude's reply meaningfully echo a user-pinned entry?
// Returns the entry that matched (so we can highlight it), or null.
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
  if (norm.length < 12) return false // too short to be meaningful evidence
  if (normReply.includes(norm)) return true
  // Fallback: any 4+ consecutive words from the entry appear in the reply.
  const words = norm.split(' ')
  if (words.length < 4) return false
  for (let i = 0; i + 4 <= words.length; i++) {
    const slice = words.slice(i, i + 4).join(' ')
    if (normReply.includes(slice)) return true
  }
  return false
}
