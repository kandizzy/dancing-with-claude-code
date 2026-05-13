'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { InputBar } from '@/components/chat/InputBar'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { UserMessage } from '@/components/chat/UserMessage'
import { MODELS, type Model } from '@/lib/api'
import { streamLevelChat, type LevelMessage } from '@/lib/level-api'
import { findGateMatch } from '@/lib/levels/registry'
import type { LevelDefinition } from '@/lib/levels/types'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const HAIKU = MODELS.find((m) => m.id === 'claude-haiku-4-5') ?? MODELS[0]

type LevelChatProps = {
  level: LevelDefinition
  className?: string
}

type RenderedMessage = LevelMessage & { id: string; matchedFingerprint?: string | null }

export function LevelChat({ level, className }: LevelChatProps) {
  const { awardShape, isCompleted } = useLearnStore()
  const [messages, setMessages] = useState<RenderedMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [model, setModel] = useState<Model>(HAIKU)
  const [showHints, setShowHints] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const completed = isCompleted(level.id)

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: RenderedMessage = { id: crypto.randomUUID(), role: 'user', content: text }
      const nextHistory: LevelMessage[] = [...messages, userMsg].map(({ role, content }) => ({
        role,
        content,
      }))
      setMessages((m) => [...m, userMsg])
      setStreaming(true)
      setStreamBuffer('')

      const controller = new AbortController()
      abortRef.current = controller

      let buffer = ''
      try {
        const full = await streamLevelChat(
          level.id,
          nextHistory,
          (delta) => {
            buffer += delta
            setStreamBuffer(buffer)
          },
          { model: model.id, signal: controller.signal },
        )
        const matched = findGateMatch(full, level.gateFingerprints)
        const assistantMsg: RenderedMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: full,
          matchedFingerprint: matched,
        }
        setMessages((m) => [...m, assistantMsg])
        if (matched && !completed) {
          awardShape(level.id, level.shape, matched)
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error(err)
        }
      } finally {
        setStreaming(false)
        setStreamBuffer('')
        abortRef.current = null
      }
    },
    [messages, level, awardShape, completed],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const showSuccess = completed && lastAssistant?.matchedFingerprint
  const showNudge = !streaming && lastAssistant && !lastAssistant.matchedFingerprint && !completed

  return (
    <div className={cn('flex h-full flex-col gap-4', className)}>
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <ClaudeMessage>
            <ClaudeParagraph className="text-text-secondary italic">
              Compose a directive in the box below. Claude has been started with this project's
              CLAUDE.md attached — your task is to ask something that would only make sense
              because of what's in that file.
            </ClaudeParagraph>
          </ClaudeMessage>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} text={m.content} />
          ) : (
            <ClaudeMessage key={m.id}>
              <ClaudeParagraph className="whitespace-pre-wrap">
                {highlightFingerprint(m.content, m.matchedFingerprint)}
              </ClaudeParagraph>
            </ClaudeMessage>
          ),
        )}

        {streaming && streamBuffer && (
          <ClaudeMessage>
            <ClaudeParagraph className="whitespace-pre-wrap">{streamBuffer}</ClaudeParagraph>
          </ClaudeMessage>
        )}
      </div>

      {showSuccess && (
        <div className="rounded-md border border-[color:var(--color-accent-strong)] bg-[color:var(--color-accent)]/5 p-4 text-sm">
          <div className="text-text-primary mb-1 flex items-center gap-2 font-semibold">
            <Check className="size-4" />
            Circle earned
          </div>
          <p className="text-text-secondary m-0">{level.successCopy}</p>
        </div>
      )}

      {showNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-secondary m-0">{level.nudgeOnMiss}</p>
          <button
            type="button"
            onClick={() => setShowHints((s) => !s)}
            className="text-text-tertiary hover:text-text-primary mt-2 text-xs underline"
          >
            {showHints ? 'Hide examples' : 'Show example questions'}
          </button>
          {showHints && (
            <ul className="text-text-secondary mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>"Which venv should I activate before running anything?"</li>
              <li>"What hostnames do the Raspberry Pis use, and how do I connect?"</li>
              <li>"What versions of depthai are pinned?"</li>
              <li>"What flag should I run a detector with so other students see when the camera is free?"</li>
            </ul>
          )}
        </div>
      )}

      <InputBar
        models={MODELS}
        model={model}
        onModelChange={setModel}
        isStreaming={streaming}
        onSend={handleSend}
        onStop={handleStop}
        placeholder="Compose a directive for Claude…"
      />
    </div>
  )
}

// Wrap the matched substring in a highlight span. Case-insensitive find.
function highlightFingerprint(text: string, fingerprint: string | null | undefined) {
  if (!fingerprint) return text
  const idx = text.toLowerCase().indexOf(fingerprint.toLowerCase())
  if (idx < 0) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + fingerprint.length)
  const after = text.slice(idx + fingerprint.length)
  return (
    <>
      {before}
      <mark className="rounded-xs bg-[color:var(--color-accent)]/20 px-0.5 font-mono">
        {match}
      </mark>
      {after}
    </>
  )
}
