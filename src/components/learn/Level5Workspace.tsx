'use client'

import { useCallback, useMemo, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { ask, readDiff } from '@/lib/ai/client'
import { ClaudeMessage } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { Button } from '@/components/ui'
import { ArrowUp, GitCompareArrows, Loader2 } from 'lucide-react'
import { getBehaviorRules, getNoteEntries } from '@/lib/levels/registry'
import { LEVEL_5_EXTRA_SYSTEM } from '@/lib/levels/level-5'
import type { LevelDefinition } from '@/lib/levels/types'

type Props = { level: LevelDefinition }

type Segment = { id: string; label: string; text: string }

export function Level5Workspace({ level }: Props) {
  const { awardShape, isCompleted, claudeMd } = useLearnStore()
  const segments = useMemo<Segment[]>(() => {
    const out: Segment[] = []
    getBehaviorRules(claudeMd).forEach((rule, i) =>
      out.push({ id: `b-${i}`, label: `Behavior rule #${i + 1}`, text: rule }),
    )
    getNoteEntries(claudeMd).forEach((text, i) =>
      out.push({ id: `n-${i}`, label: `Note #${i + 1}`, text }),
    )
    return out
  }, [claudeMd])

  const [selected, setSelected] = useState<string>('')
  const [change, setChange] = useState('')
  const [reply, setReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [diff, setDiff] = useState('')
  const [diffOpen, setDiffOpen] = useState(false)

  const selectedSegment = segments.find((s) => s.id === selected)
  const completed = isCompleted(level.id)

  const send = useCallback(async () => {
    if (!selectedSegment || !change.trim() || streaming) return
    const composed = `Segment to change (${selectedSegment.label}): "${selectedSegment.text}"\nChange I want: ${change.trim()}\n\nThe directive must forbid edits outside this segment.`
    setStreaming(true)
    setReply('')
    setDiffOpen(false)
    try {
      const result = await ask({
        systemPrompt: LEVEL_5_EXTRA_SYSTEM,
        userPrompt: composed,
      })
      setReply(result.text)
      if (!completed) {
        awardShape(level.id, level.shape, `scoped to ${selectedSegment.label}`)
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Request failed'
      setReply(`Error: ${msg}`)
    } finally {
      setStreaming(false)
    }
  }, [selectedSegment, change, streaming, level, awardShape, completed])

  const showDiff = useCallback(async () => {
    const text = await readDiff()
    setDiff(text)
    setDiffOpen(true)
  }, [])

  if (segments.length === 0) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-2 p-4">
        <p className="text-text-secondary text-sm">
          Your CLAUDE.md is empty. Open the drawer above to add a behavior rule or a note, then
          come back to scope a change to one segment.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        <div className="border-border-subtle bg-surface flex flex-col gap-3 rounded-lg border p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
              Pick exactly one segment
            </span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="text-text-primary border-border-subtle bg-page rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="">— choose one —</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}: {truncate(s.text, 80)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
              What single change?
            </span>
            <textarea
              value={change}
              onChange={(e) => setChange(e.target.value)}
              rows={3}
              placeholder="e.g. rewrite this rule so it requires citing the score, not just naming it"
              className="text-text-primary font-text border-border-subtle bg-page rounded-md border px-2 py-1 font-sans text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
            />
          </label>
        </div>

        {reply && (
          <ClaudeMessage>
            <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
              Claude's reply · scoped to {selectedSegment?.label ?? 'one segment'}
            </div>
            <ClaudeMarkdown text={reply} />
            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={showDiff}
                className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1"
              >
                <GitCompareArrows className="size-3" />
                Show what changed (git diff)
              </button>
            </div>
          </ClaudeMessage>
        )}

        {diffOpen && (
          <div className="border-border-subtle bg-page mt-2 rounded-md border">
            <div className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-3 py-1.5 text-xs">
              <GitCompareArrows className="size-3" />
              <span className="font-mono">git diff</span>
              <button
                type="button"
                onClick={() => setDiffOpen(false)}
                className="text-text-tertiary hover:text-text-primary ml-auto"
              >
                close
              </button>
            </div>
            <pre className="scroll-area max-h-72 overflow-auto p-3 font-mono text-[11px] leading-[1.55]">
              {diff || '(no changes)'}
            </pre>
          </div>
        )}
      </div>

      <ShapeAwardBanner
        levelId={level.id}
        shapeLabel="Composite"
        copy="You named one segment and forbade drift. The 'asked for one thing, got a refactor' trap is closed by composing the request to constrain its blast radius."
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={send}
          disabled={!selectedSegment || !change.trim() || streaming}
          variant="primary"
        >
          {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          Send scoped directive
        </Button>
      </div>
    </div>
  )
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}
