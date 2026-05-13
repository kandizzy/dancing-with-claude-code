'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { streamLevelChat } from '@/lib/level-api'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { HandoffPanel } from './HandoffPanel'
import { Button } from '@/components/ui'
import { ArrowUp } from 'lucide-react'
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
  const [buffer, setBuffer] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loopOutput, setLoopOutput] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const selectedSegment = segments.find((s) => s.id === selected)
  const completed = isCompleted(level.id)

  const send = useCallback(async () => {
    if (!selectedSegment || !change.trim() || streaming) return
    const composed = `Refine a directive for my local \`claude\` session that constrains the change to exactly one segment.

Segment to change (${selectedSegment.label}): "${selectedSegment.text}"
Change I want: ${change.trim()}

The directive must forbid edits outside this segment.`

    setStreaming(true)
    setBuffer('')
    setReply('')
    setLoopOutput(null)
    const controller = new AbortController()
    abortRef.current = controller
    let buf = ''
    try {
      const full = await streamLevelChat(
        level.id,
        [{ role: 'user', content: composed }],
        claudeMd,
        (d) => {
          buf += d
          setBuffer(buf)
        },
        { signal: controller.signal, extraSystem: LEVEL_5_EXTRA_SYSTEM },
      )
      setReply(full)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error(err)
    } finally {
      setStreaming(false)
      setBuffer('')
      abortRef.current = null
    }
  }, [selectedSegment, change, streaming, level, claudeMd])

  const handleLoopClosed = useCallback(
    (pastedOutput: string) => {
      setLoopOutput(pastedOutput)
      if (!completed) {
        awardShape(
          level.id,
          level.shape,
          `closed loop on ${selectedSegment?.label ?? 'a segment'}`,
        )
      }
    },
    [awardShape, completed, level, selectedSegment],
  )

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

        {reply && !buffer && (
          <ClaudeMessage>
            <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
              Refined directive · scoped to {selectedSegment?.label ?? 'one segment'}
            </div>
            <ClaudeMarkdown text={reply} />
          </ClaudeMessage>
        )}
        {buffer && (
          <ClaudeMessage>
            <ClaudeParagraph className="whitespace-pre-wrap">{buffer}</ClaudeParagraph>
          </ClaudeMessage>
        )}

        {reply && !buffer && (
          <div className="mt-3">
            <HandoffPanel
              directive={reply}
              onLoopClosed={handleLoopClosed}
              alreadyClosed={completed && loopOutput != null}
              pastedOutput={loopOutput}
            />
          </div>
        )}
      </div>

      <ShapeAwardBanner
        levelId={level.id}
        shapeLabel="Composite"
        copy="You scoped a directive to one segment, ran it on your machine, and brought the receipts back. The 'asked for one thing, got a refactor' trap is closed by composing the request to forbid drift."
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
            Send scoped directive
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
