import type { LevelDefinition, LevelId } from './types'
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

// --- System prompt assembly ------------------------------------------------

export function assembleSystemPrompt(claudeMd: string, extra?: string): string {
  const base = `You are Claude, helping a user explore a browser-based computer vision playground. The user's project has a CLAUDE.md attached. Treat it as authoritative project context.

The full contents of CLAUDE.md follow between the markers.

----- BEGIN CLAUDE.md -----
${claudeMd}
----- END CLAUDE.md -----

When information from CLAUDE.md is relevant to a question, draw on it directly — prefer it over generic best practice. The user has decided these things matter for this project. When you use a note the user wrote, quote or paraphrase it so they can see their guidance taking effect. Keep replies short (1–3 short paragraphs).`

  return extra ? `${base}\n\n${extra}` : base
}

// --- Markdown helpers ------------------------------------------------------

// Extract bullets ("- foo" or "* foo") that appear under a heading whose text
// contains `headingKeyword` (case-insensitive). Returns the bullet text without the marker.
export function getSectionBullets(markdown: string, headingKeyword: string): string[] {
  const lines = markdown.split(/\r?\n/)
  const keyword = headingKeyword.toLowerCase()
  let inSection = false
  const out: string[] = []
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      inSection = heading[2].toLowerCase().includes(keyword)
      continue
    }
    if (!inSection) continue
    const bullet = line.match(/^\s*[-*]\s+(.*\S)\s*$/)
    if (bullet) out.push(bullet[1])
  }
  return out
}

export const getNoteEntries = (markdown: string) => getSectionBullets(markdown, 'note')
export const getBehaviorRules = (markdown: string) => getSectionBullets(markdown, 'behave')

// Append a new bullet under the existing "## Notes" section (case-insensitive heading match),
// creating that section at the end of the document if it does not exist.
export function appendNoteToMarkdown(markdown: string, note: string): string {
  const trimmed = note.trim()
  if (!trimmed) return markdown
  const bullet = `- ${trimmed}`
  const lines = markdown.split('\n')

  let notesIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^##\s+(.*)$/)
    if (heading && heading[1].toLowerCase().includes('note')) {
      notesIdx = i
      break
    }
  }
  if (notesIdx < 0) {
    return markdown.trimEnd() + '\n\n## Notes\n\n' + bullet + '\n'
  }
  // Find end of the Notes section (next ## heading or EOF).
  let endOfNotes = lines.length
  for (let i = notesIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endOfNotes = i
      break
    }
  }
  // Walk back past trailing empty lines so the new bullet sits next to existing content.
  let insertAt = endOfNotes
  while (insertAt > notesIdx + 1 && lines[insertAt - 1].trim() === '') {
    insertAt--
  }
  lines.splice(insertAt, 0, bullet)
  return lines.join('\n')
}

// --- Gate match ------------------------------------------------------------

// Did Claude's reply meaningfully echo one of the user's pinned notes? Returns the matched
// note text if so. We only match against bullets under "## Notes" — the bullets in the
// behavior/about sections are seed-side and don't earn the circle.
export function findUserEntryMatch(reply: string, claudeMd: string): string | null {
  const entries = getNoteEntries(claudeMd)
  const normReply = normalize(reply)
  for (const entry of entries) {
    if (entryMatches(entry, normReply)) return entry
  }
  return null
}

// Lowercase, strip any non-letter/non-number char (keeps Unicode α etc.) and collapse
// whitespace. This makes word boundaries clean — punctuation like `, . — ) ( ` ' "` no
// longer attaches to words and trip up slice matching.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function entryMatches(entryText: string, normReply: string): boolean {
  const norm = normalize(entryText)
  if (norm.length < 12) return false
  if (normReply.includes(norm)) return true
  // Fallback: any 3+ consecutive words from the entry appear in the reply. Reduced from 4
  // because real replies paraphrase rather than copy — 4-word matches missed cases where
  // Claude obviously drew on the note but rephrased.
  const words = norm.split(' ')
  if (words.length < 3) return false
  for (let i = 0; i + 3 <= words.length; i++) {
    const slice = words.slice(i, i + 3).join(' ')
    // Skip 3-word slices that are too generic (mostly stopwords) so we don't match on
    // "and the to" or "is in the".
    if (isTooGeneric(slice)) continue
    if (normReply.includes(slice)) return true
  }
  return false
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'as', 'it', 'its', 'this',
  'that', 'these', 'those', 'i', 'you', 'we', 'they', 'them', 'us', 'me', 'my',
  'your', 'our', 'their', 'so', 'if', 'when', 'then', 'do', 'does', 'did',
  'can', 'will', 'would', 'should', 'could', 'have', 'has', 'had',
])

function isTooGeneric(slice: string): boolean {
  const words = slice.split(' ')
  const contentful = words.filter((w) => !STOPWORDS.has(w))
  // A 3-word slice with fewer than 2 contentful words is essentially "the of in" — junk.
  return contentful.length < 2
}
