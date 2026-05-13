'use client'

import { useCallback, useRef, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { streamLevelChat } from '@/lib/level-api'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { Button } from '@/components/ui'
import { ArrowUp } from 'lucide-react'
import type { LevelDefinition } from '@/lib/levels/types'

type Props = { level: LevelDefinition }

export function Level3Workspace({ level }: Props) {
  const { awardShape, isCompleted, claudeMd } = useLearnStore()
  const [scope, setScope] = useState('')
  const [target, setTarget] = useState('')
  const [action, setAction] = useState('')
  const [reply, setReply] = useState<string>('')
  const [buffer, setBuffer] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const allFilled = scope.trim() && target.trim() && action.trim()

  const send = useCallback(async () => {
    if (!allFilled || streaming) return
    const directive = `I'm directing you with a scoped change. Operate strictly within these bounds.

Scope: ${scope.trim()}
Target: ${target.trim()}
Action: ${action.trim()}

Acknowledge what you'll do in one sentence, then do it. Do not touch anything outside the named target.`

    setStreaming(true)
    setBuffer('')
    setReply('')
    const controller = new AbortController()
    abortRef.current = controller
    let buf = ''
    try {
      const full = await streamLevelChat(
        level.id,
        [{ role: 'user', content: directive }],
        claudeMd,
        (d) => {
          buf += d
          setBuffer(buf)
        },
        { signal: controller.signal },
      )
      setReply(full)
      // Gate: user submitted with all three fields filled.
      if (!isCompleted(level.id)) {
        awardShape(level.id, level.shape, `${scope.trim()} | ${target.trim()} | ${action.trim()}`)
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error(err)
    } finally {
      setStreaming(false)
      setBuffer('')
      abortRef.current = null
    }
  }, [allFilled, scope, target, action, streaming, level, claudeMd, awardShape, isCompleted])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        <div className="border-border-subtle bg-surface flex flex-col gap-3 rounded-lg border p-4">
          <Field
            label="Scope"
            placeholder="What slice of the project? (e.g. the behavior rules)"
            value={scope}
            onChange={setScope}
          />
          <Field
            label="Target"
            placeholder="Which specific rule, note, or section? (e.g. behavior rule #2)"
            value={target}
            onChange={setTarget}
          />
          <Field
            label="Action"
            placeholder="What single change? (e.g. tighten its wording to require a number, not a vague threshold)"
            value={action}
            onChange={setAction}
            multiline
          />
        </div>

        {(reply || buffer) && (
          <ClaudeMessage>
            <ClaudeParagraph className="whitespace-pre-wrap">{reply || buffer}</ClaudeParagraph>
          </ClaudeMessage>
        )}
      </div>

      <ShapeAwardBanner
        levelId={level.id}
        shapeLabel="Arc"
        copy="You wrote a directive instead of a chat. Notice how Claude's response is on-target and bounded — that's what scope, target, and action buy you."
      />

      <div className="flex items-center justify-end gap-2">
        {streaming ? (
          <Button onClick={() => abortRef.current?.abort()}>Stop</Button>
        ) : (
          <Button onClick={send} disabled={!allFilled} variant="primary">
            <ArrowUp className="size-4" />
            Send directive
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  multiline,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      <Tag
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={multiline ? 2 : undefined}
        className="text-text-primary font-text placeholder:text-text-tertiary border-border-subtle bg-page rounded-md border px-2 py-1 font-sans text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
      />
    </label>
  )
}
