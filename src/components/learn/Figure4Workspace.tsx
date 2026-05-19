'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { ask } from '@/lib/ai/client'
import { FIGURE_4_EXTRA_SYSTEM } from '@/lib/figures/figure-4'
import { Button } from '@/components/ui'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { ArrowUp, Check, FileEdit, Loader2, X } from 'lucide-react'
import { diffLines, type Change } from 'diff'
import type { FigureDefinition } from '@/lib/figures/types'

type Props = { figure: FigureDefinition }

// Starter requests the user can one-click into the input. Two are general behavior
// rules anyone can imagine (and would benefit from), one is CV-flavored so the
// pattern stays visible. Each one phrased as an edit to CLAUDE.md so the diff that
// comes back is plausibly useful regardless of who's using the prototype.
const STARTERS: Array<{ label: string; text: string }> = [
  {
    label: 'Ask before refactoring',
    text: "Add a behavior rule: before making any change that touches more than one file, describe the full plan in plain language and wait for me to confirm. Don't refactor across files without checking in first.",
  },
  {
    label: 'Keep the layout intact',
    text: 'Add a behavior rule: when changing UI code, do not modify spacing, padding, font choices, or color tokens unless I specifically asked you to. If a change would touch styling, mention it first.',
  },
  {
    label: 'Add a stack constraint',
    text: "Add a behavior rule: stick to MediaPipe Tasks for any detection-related code. Don't suggest swapping in OpenCV, YOLO, or another library unless I specifically ask.",
  },
]

export function Figure4Workspace({ figure }: Props) {
  const { awardShape, isCompleted, claudeMd, setClaudeMd, setClaudeMdOpen } = useLearnStore()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [proposed, setProposed] = useState<string | null>(null)
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const diffRef = useRef<HTMLDivElement>(null)

  // Snap to the top of the diff card the moment it appears so the user sees the change.
  useEffect(() => {
    if (proposed && diffRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: diffRef.current.offsetTop - scrollRef.current.offsetTop - 8,
        behavior: 'smooth',
      })
    }
  }, [proposed])

  const changes = useMemo<Change[] | null>(() => {
    if (proposed == null) return null
    return collapseCosmeticDiff(diffLines(claudeMd, proposed))
  }, [claudeMd, proposed])

  const stats = useMemo(() => {
    if (!changes) return { added: 0, removed: 0 }
    let added = 0
    let removed = 0
    for (const c of changes) {
      const lineCount = c.value.split('\n').filter((l) => l.length > 0).length
      if (c.added) added += lineCount
      else if (c.removed) removed += lineCount
    }
    return { added, removed }
  }, [changes])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setStreaming(true)
    setProposed(null)
    setDecision(null)
    setError(null)
    try {
      const composed = `Current CLAUDE.md:\n----- BEGIN CLAUDE.md -----\n${claudeMd}\n----- END CLAUDE.md -----\n\nRequested change: ${text}`
      const result = await ask({
        systemPrompt: FIGURE_4_EXTRA_SYSTEM,
        userPrompt: composed,
        // CLAUDE.md is already inlined in the user prompt above — no need to
        // load it again via project context. Saves the duplicate read.
      })
      const extracted = extractMarkdownBlock(result.text)
      if (!extracted) {
        setError(
          "Claude didn't return a fenced markdown block. In real Claude Code, this is exactly the kind of moment to re-prompt — the proposal is unreviewable as-is.",
        )
        return
      }
      if (extracted.trim() === claudeMd.trim()) {
        setError(
          'Claude returned the same file unchanged. Either the ask was too vague, or there was nothing to change. Try rewording more concretely.',
        )
        return
      }
      setProposed(extracted)
    } catch (err) {
      setError((err as Error)?.message ?? 'Request failed')
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, claudeMd])

  const decide = (kind: 'accepted' | 'rejected') => {
    setDecision(kind)
    if (kind === 'accepted' && proposed != null) {
      setClaudeMd(proposed)
      setClaudeMdOpen(true)
    }
    if (!isCompleted(figure.id)) {
      awardShape(figure.id, figure.shape, kind)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto pr-2">
        <p className="text-text-secondary mb-2 text-sm leading-relaxed">
          When Claude wants to modify a file, it doesn&apos;t just do it — in real Claude Code
          the <strong>Edit tool pauses</strong> and shows you a diff first, then waits for a
          keypress: <code className="font-mono text-xs">y</code> to accept,{' '}
          <code className="font-mono text-xs">n</code> to reject,{' '}
          <code className="font-mono text-xs">d</code> to see the full diff,{' '}
          <code className="font-mono text-xs">e</code> to edit it before accepting. That
          pause is your last chance to catch a wrong assumption before the file changes on
          disk. 3/5 surveyed students said they just hit{' '}
          <code className="font-mono">y</code>.
        </p>
        <p className="text-text-tertiary mb-3 text-xs leading-relaxed">
          We exercise that pause here on a file you already own — your{' '}
          <code className="font-mono">CLAUDE.md</code>. Describe a change. Claude proposes the
          new file. You read the diff, then decide.
        </p>

        <div className="border-border-subtle bg-page mb-3 rounded-lg border p-3">
          <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
            Need a starter? Try one.
          </div>
          <div className="flex flex-col gap-1.5">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setInput(s.text)}
                disabled={streaming}
                className="hover:bg-state-hover -mx-2 flex items-start gap-2 rounded-md px-2 py-1.5 text-left disabled:opacity-60"
              >
                <div className="flex-1">
                  <div className="text-text-primary text-sm font-medium">{s.label}</div>
                  <div className="text-text-tertiary text-xs leading-snug">{s.text}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {proposed && changes && (
          <div
            ref={diffRef}
            className="border-border-subtle bg-surface mt-4 overflow-hidden rounded-lg border"
          >
            <div className="border-border-soft flex items-center justify-between gap-2 border-b px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <FileEdit className="text-text-secondary size-3.5" />
                <span className="text-text-primary font-mono">Edit</span>
                <span className="text-text-tertiary">·</span>
                <span className="text-text-secondary">
                  file: <code className="font-mono text-[11px]">CLAUDE.md</code>
                </span>
              </div>
              <span className="font-mono text-[11px]">
                <span className="text-[color:var(--color-success,#16a34a)]">+{stats.added}</span>
                {' '}
                <span className="text-[color:var(--color-danger,#dc2626)]">−{stats.removed}</span>
              </span>
            </div>
            <div className="border-border-soft text-text-tertiary border-b px-4 py-1.5 text-[10px] uppercase tracking-[0.12em]">
              This is exactly what real Claude Code shows you before applying an edit.
            </div>
            <DiffView changes={changes} />
            {decision == null ? (
              <div className="border-border-soft flex items-center gap-2 border-t px-4 py-3">
                <Button onClick={() => decide('accepted')} variant="primary">
                  <Check className="size-4" />
                  Accept change
                </Button>
                <Button onClick={() => decide('rejected')}>
                  <X className="size-4" />
                  Reject
                </Button>
                <span className="text-text-tertiary ml-2 text-xs">
                  Either choice earns the square. Auto-accepting skips the muscle we&apos;re
                  building.
                </span>
              </div>
            ) : (
              <div className="border-border-soft text-text-secondary border-t px-4 py-3 text-xs">
                You {decision === 'accepted' ? 'accepted' : 'rejected'} this change.
                {decision === 'accepted' && ' Your CLAUDE.md is updated.'}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="border-border-subtle mt-4 rounded-md border p-3 text-xs">
            <p className="text-text-secondary m-0">{error}</p>
          </div>
        )}
      </div>

      <ShapeAwardBanner
        figureId={figure.id}
        shapeLabel="Square"
        copy="You read the diff before it landed. Every file edit, every shell command, every Write — real Claude Code pauses on all of them and asks. Auto-accept skips the pause; it also skips your last chance to catch a wrong assumption. The muscle is to stop and look."
      />

      <div className="border-border-subtle bg-surface relative rounded-xl border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          placeholder="Describe a change to your CLAUDE.md…"
          disabled={streaming}
          className="text-text-primary font-text placeholder:text-text-tertiary w-full resize-none border-none bg-transparent p-0 text-sm leading-snug outline-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="primary"
            onClick={send}
            disabled={!input.trim() || streaming}
            aria-label="Send"
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Pull the markdown content out of a ```markdown ... ``` fenced block. Falls back to the
// whole reply if the response wasn't fenced.
function extractMarkdownBlock(text: string): string | null {
  const match = text.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/)
  if (match) return match[1]
  // No fence — accept only if the whole reply looks like markdown (no obvious prose preamble).
  const trimmed = text.trim()
  if (!trimmed) return null
  return trimmed
}

// Collapse adjacent remove+add hunks whose content is identical after normalizing
// whitespace. Without this, Claude occasionally returns the file with imperceptible
// whitespace differences on lines whose meaning didn't change — diffLines faithfully
// shows those as remove+add pairs, which renders as noise the user has to mentally
// filter out. We do the filtering here.
function collapseCosmeticDiff(changes: Change[]): Change[] {
  const normalize = (s: string) =>
    s
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, '').replace(/[ \t]+/g, ' '))
      .join('\n')
      .trim()

  const result: Change[] = []
  let i = 0
  while (i < changes.length) {
    const cur = changes[i]
    const next = changes[i + 1]
    // A remove immediately followed by an add (or vice versa) with the same
    // normalized content is cosmetic — merge into a single unchanged hunk.
    if (
      next &&
      ((cur.removed && next.added) || (cur.added && next.removed)) &&
      normalize(cur.value) === normalize(next.value)
    ) {
      // Keep the "add" side's value (it's the version that survives) and emit it as a
      // proper unchanged hunk — diff's Change type needs added/removed/count, not just value.
      const mergedValue = cur.removed ? next.value : cur.value
      result.push({
        value: mergedValue,
        added: false,
        removed: false,
        count: mergedValue.split('\n').length,
      })
      i += 2
      continue
    }
    result.push(cur)
    i += 1
  }
  return result
}

function DiffView({ changes }: { changes: Change[] }) {
  return (
    <pre className="scroll-area max-h-[60vh] overflow-auto p-3 font-mono text-[12px] leading-[1.55]">
      {changes.map((c, i) => {
        const lines = c.value.split('\n')
        // diffLines often leaves a trailing empty string from the final '\n'; drop it so we
        // don't render an extra blank line at the seam of each hunk.
        if (lines[lines.length - 1] === '') lines.pop()
        const prefix = c.added ? '+' : c.removed ? '-' : ' '
        const color = c.added
          ? 'bg-[color:var(--color-success,#16a34a)]/10 text-[color:var(--color-success,#16a34a)]'
          : c.removed
            ? 'bg-[color:var(--color-danger,#dc2626)]/10 text-[color:var(--color-danger,#dc2626)]'
            : 'text-text-secondary'
        return (
          <span key={i} className={`block ${color}`}>
            {lines.map((line, j) => (
              <span key={j} className="block whitespace-pre-wrap">
                {prefix} {line}
              </span>
            ))}
          </span>
        )
      })}
    </pre>
  )
}
