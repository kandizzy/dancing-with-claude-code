'use client'

import { useCallback, useRef, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { streamLevelChat } from '@/lib/level-api'
import { LEVEL_4_EXTRA_SYSTEM, LEVEL_4_TOOL } from '@/lib/levels/level-4'
import { Button } from '@/components/ui'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { ArrowUp, AlertTriangle, Check, X } from 'lucide-react'
import type { LevelDefinition } from '@/lib/levels/types'

type Props = { level: LevelDefinition }

type ToolProposal = {
  tool: string
  params: Record<string, unknown>
  reason: string
}

export function Level4Workspace({ level }: Props) {
  const { awardShape, isCompleted, claudeMd } = useLearnStore()
  const [input, setInput] = useState(
    'Crowded scenes are giving me too many false detections. Raise the threshold.',
  )
  const [streaming, setStreaming] = useState(false)
  const [raw, setRaw] = useState('')
  const [proposal, setProposal] = useState<ToolProposal | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [decision, setDecision] = useState<'accepted' | 'rejected' | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return
    setStreaming(true)
    setRaw('')
    setProposal(null)
    setParseError(null)
    setDecision(null)
    const controller = new AbortController()
    abortRef.current = controller
    let buf = ''
    try {
      const full = await streamLevelChat(
        level.id,
        [{ role: 'user', content: input }],
        claudeMd,
        (d) => {
          buf += d
          setRaw(buf)
        },
        { signal: controller.signal, extraSystem: LEVEL_4_EXTRA_SYSTEM },
      )
      try {
        const cleaned = full.trim().replace(/^```json\s*|\s*```$/g, '')
        const parsed = JSON.parse(cleaned) as ToolProposal
        setProposal(parsed)
      } catch (err) {
        setParseError(
          'Claude returned text we could not parse as a tool proposal. The raw reply is below — in real tool-use, this is exactly the kind of moment to re-prompt.',
        )
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error(err)
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, level, claudeMd])

  const decide = (kind: 'accepted' | 'rejected') => {
    setDecision(kind)
    if (!isCompleted(level.id)) {
      awardShape(level.id, level.shape, kind)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        <p className="text-text-secondary text-sm">
          Ask Claude something that would change a playground setting. Instead of prose, it will
          reply with a tool proposal. <em>You</em> decide whether it runs.
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          disabled={streaming}
          className="text-text-primary font-text border-border-subtle bg-page mt-3 w-full rounded-md border px-3 py-2 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
        />

        {streaming && (
          <pre className="text-text-tertiary mt-3 whitespace-pre-wrap font-mono text-xs">
            {raw}
          </pre>
        )}

        {proposal && !streaming && (
          <div className="border-border-subtle bg-surface mt-4 rounded-lg border">
            <div className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-4 py-2 text-xs">
              <AlertTriangle className="size-4" />
              Tool proposal — review before accepting
            </div>
            <div className="grid gap-3 p-4 text-sm">
              <Row label="Tool">
                <code className="font-mono">{proposal.tool}</code>
                <span className="text-text-tertiary ml-2 text-xs">
                  ({LEVEL_4_TOOL.description})
                </span>
              </Row>
              <Row label="Params">
                <pre className="bg-page rounded font-mono text-xs">
                  {JSON.stringify(proposal.params, null, 2)}
                </pre>
              </Row>
              <Row label="Reason">
                <p className="m-0">{proposal.reason}</p>
              </Row>
            </div>
            {decision == null ? (
              <div className="border-border-soft flex items-center gap-2 border-t px-4 py-3">
                <Button onClick={() => decide('accepted')} variant="primary">
                  <Check className="size-4" />
                  Accept
                </Button>
                <Button onClick={() => decide('rejected')}>
                  <X className="size-4" />
                  Reject
                </Button>
                <span className="text-text-tertiary ml-2 text-xs">
                  Either choice earns the shape. Auto-accepting bypasses the muscle.
                </span>
              </div>
            ) : (
              <div className="border-border-soft text-text-secondary border-t px-4 py-3 text-xs">
                You {decision === 'accepted' ? 'accepted' : 'rejected'} this proposal.
              </div>
            )}
          </div>
        )}

        {parseError && (
          <div className="border-border-subtle mt-4 rounded-md border p-3 text-xs">
            <p className="text-text-secondary m-0">{parseError}</p>
            <pre className="text-text-tertiary mt-2 whitespace-pre-wrap font-mono">{raw}</pre>
          </div>
        )}
      </div>

      <ShapeAwardBanner
        levelId={level.id}
        shapeLabel="Square"
        copy="You read what Claude was about to do and chose. In Claude Code, every file edit and shell command flows through this same loop — the muscle is to stop and look."
      />

      <div className="flex items-center justify-end gap-2">
        {streaming ? (
          <Button onClick={() => abortRef.current?.abort()}>Stop</Button>
        ) : (
          <Button onClick={send} disabled={!input.trim()} variant="primary">
            <ArrowUp className="size-4" />
            Ask Claude
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-baseline gap-3">
      <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      <div className="text-text-primary text-sm">{children}</div>
    </div>
  )
}
