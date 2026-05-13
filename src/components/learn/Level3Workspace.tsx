'use client'

import { useCallback, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { ask, readDiff } from '@/lib/ai/client'
import { ClaudeMessage } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { Button } from '@/components/ui'
import { ArrowUp, GitCompareArrows, Loader2 } from 'lucide-react'
import { LEVEL_3_EXTRA_SYSTEM } from '@/lib/levels/level-3'
import type { LevelDefinition } from '@/lib/levels/types'

type Props = { level: LevelDefinition }

export function Level3Workspace({ level }: Props) {
  const { awardShape, isCompleted } = useLearnStore()
  const [scope, setScope] = useState('')
  const [target, setTarget] = useState('')
  const [action, setAction] = useState('')
  const [reply, setReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [diff, setDiff] = useState('')
  const [diffOpen, setDiffOpen] = useState(false)

  const allFilled = scope.trim() && target.trim() && action.trim()
  const completed = isCompleted(level.id)

  const send = useCallback(async () => {
    if (!allFilled || streaming) return
    const composed = `Scope: ${scope.trim()}\nTarget: ${target.trim()}\nAction: ${action.trim()}`
    setStreaming(true)
    setReply('')
    setDiffOpen(false)
    try {
      const result = await ask({
        systemPrompt: LEVEL_3_EXTRA_SYSTEM,
        userPrompt: composed,
      })
      setReply(result.text)
      // Gate fires on the user's authored act — submitting a complete directive.
      if (!completed) {
        awardShape(level.id, level.shape, `${scope.trim()} | ${target.trim()} | ${action.trim()}`)
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Request failed'
      setReply(`Error: ${msg}`)
    } finally {
      setStreaming(false)
    }
  }, [allFilled, scope, target, action, streaming, level, awardShape, completed])

  const showDiff = useCallback(async () => {
    const text = await readDiff()
    setDiff(text)
    setDiffOpen(true)
  }, [])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        <div className="border-border-subtle bg-surface flex flex-col gap-3 rounded-lg border p-4">
          <Field
            label="Scope"
            placeholder="What slice of the project? (e.g. the face detector's confidence threshold)"
            value={scope}
            onChange={setScope}
          />
          <Field
            label="Target"
            placeholder="Which specific file or component? (e.g. WebcamPlayground.tsx)"
            value={target}
            onChange={setTarget}
          />
          <Field
            label="Action"
            placeholder="What single change? (e.g. add a slider that updates the threshold state)"
            value={action}
            onChange={setAction}
            multiline
          />
        </div>

        {reply && (
          <ClaudeMessage>
            <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
              Claude's reply
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
        shapeLabel="Arc"
        copy="You composed a directive — scope, target, action — instead of chatting vaguely. In CLI mode Claude can act on it directly; in API mode it describes what the change would be."
      />

      <div className="flex items-center justify-end gap-2">
        <Button onClick={send} disabled={!allFilled || streaming} variant="primary">
          {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          Send directive
        </Button>
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
