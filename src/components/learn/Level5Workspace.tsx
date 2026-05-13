'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { streamLevelChat } from '@/lib/level-api'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { Button } from '@/components/ui'
import { ArrowUp } from 'lucide-react'
import type { LevelDefinition } from '@/lib/levels/types'

type Props = { level: LevelDefinition }

type Segment = { id: string; label: string; text: string }

export function Level5Workspace({ level }: Props) {
  const { awardShape, isCompleted, claudeMd } = useLearnStore()
  const segments = useMemo<Segment[]>(() => {
    const out: Segment[] = []
    claudeMd.behavior.forEach((rule, i) =>
      out.push({ id: `b-${i}`, label: `Behavior rule #${i + 1}`, text: rule }),
    )
    claudeMd.userEntries.forEach((entry, i) =>
      out.push({ id: `e-${entry.id}`, label: `Pinned note #${i + 1}`, text: entry.text }),
    )
    return out
  }, [claudeMd])

  const [selected, setSelected] = useState<string>('')
  const [change, setChange] = useState('')
  const [reply, setReply] = useState('')
  const [buffer, setBuffer] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const selectedSegment = segments.find((s) => s.id === selected)

  const send = useCallback(async () => {
    if (!selectedSegment || !change.trim() || streaming) return
    const scoped = `I want a change scoped to exactly one segment of my project. Do not modify or comment on anything outside it.

Segment (${selectedSegment.label}): "${selectedSegment.text}"
Change I want: ${change.trim()}

Show me the new wording for this one segment, and only this one segment. End with a one-line note on what I should NOT change as a result.`

    setStreaming(true)
    setBuffer('')
    setReply('')
    const controller = new AbortController()
    abortRef.current = controller
    let buf = ''
    try {
      const full = await streamLevelChat(
        level.id,
        [{ role: 'user', content: scoped }],
        claudeMd,
        (d) => {
          buf += d
          setBuffer(buf)
        },
        { signal: controller.signal },
      )
      setReply(full)
      if (!isCompleted(level.id)) {
        awardShape(level.id, level.shape, `scoped to ${selectedSegment.label}`)
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error(err)
    } finally {
      setStreaming(false)
      setBuffer('')
      abortRef.current = null
    }
  }, [selectedSegment, change, streaming, level, claudeMd, awardShape, isCompleted])

  if (segments.length === 0) {
    return (
      <div className="flex h-full flex-col items-start justify-center gap-2 p-4">
        <p className="text-text-secondary text-sm">
          Your CLAUDE.md is empty. Add a behavior rule or pin a note in the left panel, then come
          back to scope a change to one segment.
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

        {(reply || buffer) && (
          <ClaudeMessage>
            <ClaudeParagraph className="whitespace-pre-wrap">{reply || buffer}</ClaudeParagraph>
          </ClaudeMessage>
        )}
      </div>

      <ShapeAwardBanner
        levelId={level.id}
        shapeLabel="Composite"
        copy="You scoped a change to one segment and left the rest untouched. That's the whole muscle behind branch-and-segment thinking in real Claude Code work — it's how you avoid the 'I asked for one thing and it refactored everything' trap."
      />

      <div className="flex items-center justify-end gap-2">
        {streaming ? (
          <Button onClick={() => abortRef.current?.abort()}>Stop</Button>
        ) : (
          <Button
            onClick={send}
            disabled={!selectedSegment || !change.trim()}
            variant="primary"
          >
            <ArrowUp className="size-4" />
            Send scoped change
          </Button>
        )}
      </div>
    </div>
  )
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}
