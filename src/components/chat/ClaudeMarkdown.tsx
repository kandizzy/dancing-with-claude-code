'use client'

import { useMemo } from 'react'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

type Props = {
  text: string
  /** Optional substring to wrap in a <mark>. Falls back to a 4-word slice. */
  highlight?: string | null
  className?: string
}

/**
 * Render a Claude reply as parsed markdown (bullets, code, bold, etc.) — replaces
 * the raw whitespace-pre-wrap pattern that was leaving asterisks and dashes on the
 * page. Uses the same `.md-preview` typography pass that the MarkdownEditor uses,
 * so chat replies and the CLAUDE.md preview look like the same document type.
 */
export function ClaudeMarkdown({ text, highlight, className }: Props) {
  const html = useMemo(() => {
    let parsed: string
    try {
      parsed = marked.parse(text, { async: false }) as string
    } catch {
      return escapeHtml(text)
    }
    if (highlight) parsed = wrapHighlight(parsed, highlight)
    return parsed
  }, [text, highlight])

  return (
    <div
      className={cn('md-preview text-text-primary text-sm leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Wrap the first appearance of `highlight` (or any 4-word slice of it) in a <mark>.
// Skip if the match crosses HTML tag boundaries — that case is rare in practice
// and not worth the risk of breaking the markup.
function wrapHighlight(html: string, highlight: string): string {
  const lowerHtml = html.toLowerCase()
  const lower = highlight.toLowerCase()
  let idx = lowerHtml.indexOf(lower)
  let len = highlight.length
  if (idx < 0) {
    const words = highlight.split(/\s+/)
    for (let i = 0; i + 4 <= words.length; i++) {
      const slice = words
        .slice(i, i + 4)
        .join(' ')
        .toLowerCase()
      const at = lowerHtml.indexOf(slice)
      if (at >= 0) {
        idx = at
        len = slice.length
        break
      }
    }
  }
  if (idx < 0) return html
  const matched = html.slice(idx, idx + len)
  if (matched.includes('<') || matched.includes('>')) return html
  const before = html.slice(0, idx)
  const after = html.slice(idx + len)
  return `${before}<mark class="rounded-xs bg-[color:var(--color-accent)]/25 px-0.5">${matched}</mark>${after}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
