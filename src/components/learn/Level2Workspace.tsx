'use client'

import { useCallback, useRef, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { streamLevelChat, type LevelMessage } from '@/lib/level-api'
import { LEVEL_2_COMMANDS, type SlashCommand } from '@/lib/levels/level-2'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { Button } from '@/components/ui'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { cn } from '@/lib/utils'
import { ArrowUp, Square, Terminal } from 'lucide-react'
import type { LevelDefinition } from '@/lib/levels/types'

type Props = { level: LevelDefinition }
type Rendered = LevelMessage & { id: string; viaSlash?: string }

export function Level2Workspace({ level }: Props) {
  const { awardShape, isCompleted, claudeMd } = useLearnStore()
  const [messages, setMessages] = useState<Rendered[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [buffer, setBuffer] = useState('')
  const [pickedCommand, setPickedCommand] = useState<SlashCommand | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const showPalette = input.startsWith('/') && !streaming
  const paletteMatches = showPalette
    ? LEVEL_2_COMMANDS.filter((c) =>
        c.name.includes(input.slice(1).split(/\s/)[0].toLowerCase()),
      )
    : []

  const pickCommand = (cmd: SlashCommand) => {
    setInput(cmd.prompt)
    setPickedCommand(cmd)
  }

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return
    const wasViaSlash = pickedCommand?.prompt === input ? pickedCommand.name : undefined
    const userMsg: Rendered = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      viaSlash: wasViaSlash,
    }
    const nextHistory: LevelMessage[] = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }))
    setMessages((m) => [...m, userMsg])
    setInput('')
    setPickedCommand(null)
    setStreaming(true)
    setBuffer('')

    const controller = new AbortController()
    abortRef.current = controller
    let buf = ''
    try {
      const full = await streamLevelChat(
        level.id,
        nextHistory,
        claudeMd,
        (d) => {
          buf += d
          setBuffer(buf)
        },
        { signal: controller.signal },
      )
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: full }])
      // Gate: user invoked a slash command on this turn.
      if (wasViaSlash && !isCompleted(level.id)) {
        awardShape(level.id, level.shape, `invoked /${wasViaSlash}`)
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') console.error(err)
    } finally {
      setStreaming(false)
      setBuffer('')
      abortRef.current = null
    }
  }, [input, streaming, pickedCommand, messages, level, claudeMd, awardShape, isCompleted])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <ClaudeMessage>
            <ClaudeParagraph className="text-text-secondary italic">
              Type <code>/</code> in the input to see what this playground ships with. Pick one,
              send it — you'll have earned the triangle.
            </ClaudeParagraph>
          </ClaudeMessage>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id}>
              {m.viaSlash && (
                <div className="text-text-tertiary mb-1 mr-1 flex items-center justify-end gap-1 text-xs">
                  <Terminal className="size-3" />/{m.viaSlash}
                </div>
              )}
              <UserMessage text={m.content} />
            </div>
          ) : (
            <ClaudeMessage key={m.id}>
              <ClaudeMarkdown text={m.content} />
            </ClaudeMessage>
          ),
        )}
        {streaming && buffer && (
          <ClaudeMessage>
            <ClaudeParagraph className="whitespace-pre-wrap">{buffer}</ClaudeParagraph>
          </ClaudeMessage>
        )}
      </div>

      <ShapeAwardBanner
        levelId={level.id}
        shapeLabel="Triangle"
        copy="You found a command you didn't know was there and used it. Real Claude Code projects ship .claude/commands/*.md files — try /init in a project to set yours up."
      />

      <div className="border-border-subtle bg-surface relative rounded-xl border p-3">
        {showPalette && paletteMatches.length > 0 && (
          <div className="border-border-subtle bg-surface absolute inset-x-3 bottom-full mb-2 max-h-64 overflow-y-auto rounded-md border shadow-lg">
            {paletteMatches.map((cmd) => (
              <button
                key={cmd.name}
                type="button"
                onClick={() => pickCommand(cmd)}
                className="hover:bg-state-hover flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
              >
                <div className="text-text-primary font-mono text-sm">/{cmd.name}</div>
                <div className="text-text-tertiary text-xs">{cmd.description}</div>
              </button>
            ))}
          </div>
        )}
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
          placeholder="Type / to discover commands, or write freely…"
          disabled={streaming}
          className="text-text-primary font-text placeholder:text-text-tertiary w-full resize-none border-none bg-transparent p-0 font-sans text-base leading-snug outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {pickedCommand ? (
            <span className="text-text-tertiary text-xs">
              <code className="font-mono">/{pickedCommand.name}</code> staged — edit if you like,
              then send
            </span>
          ) : (
            <span className="text-text-tertiary text-xs">
              Tip: start with <code>/</code>
            </span>
          )}
          {streaming ? (
            <Button size="icon" variant="primary" onClick={() => abortRef.current?.abort()}>
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="primary"
              onClick={send}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <ArrowUp className={cn('size-4')} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
