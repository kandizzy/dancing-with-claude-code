import type { FigureDefinition, FigureId, ShapeKind } from './types'
import { figure1 } from './figure-1'
import { figure2 } from './figure-2'
import { figure3 } from './figure-3'
import { figure4 } from './figure-4'
import { figure5 } from './figure-5'

export const FIGURES: Record<FigureId, FigureDefinition> = {
  1: figure1,
  2: figure2,
  3: figure3,
  4: figure4,
  5: figure5,
}

export function getFigure(id: number): FigureDefinition | null {
  if (id < 1 || id > 5) return null
  return FIGURES[id as FigureId] ?? null
}

// Derived nav lookups — nav surfaces (landing, /home, ShapeTray, header) share
// these instead of each keeping a copy-pasted record.
export const FIGURE_SHAPES = Object.fromEntries(
  (Object.keys(FIGURES) as unknown as FigureId[]).map((id) => [id, FIGURES[id].shape]),
) as Record<FigureId, ShapeKind>

export function figureLabel(id: FigureId): string {
  return `Figure ${id} · ${FIGURES[id].title}`
}

// --- System prompt assembly ------------------------------------------------

export function assembleSystemPrompt(claudeMd: string, extra?: string): string {
  const base = `You are Claude, helping a user explore a small webcam project they have cloned locally — a browser-based face-detection app built on MediaPipe Tasks. The user's project has a CLAUDE.md attached. Treat it as authoritative project context.

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
