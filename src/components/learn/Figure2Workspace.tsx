'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { listCommands, type SlashCommand } from '@/lib/ai/client'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import { Button } from '@/components/ui'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { ThinkingState } from './ThinkingState'
import { useAskSession } from '@/lib/ask-session-store'
import { cn } from '@/lib/utils'
import { ArrowUp, ChevronDown, ChevronRight, RefreshCw, Square, Terminal } from 'lucide-react'
import type { FigureDefinition } from '@/lib/figures/types'

type Props = { figure: FigureDefinition }

// Expand a slash invocation against a command's body: `$ARGUMENTS` is replaced with
// whatever followed the slash token; a command file without the placeholder gets the
// args appended as a Task: line so the user's intent isn't silently dropped. Mirrors
// real Claude Code's slash-command semantics.
function expandCommand(cmd: SlashCommand, args: string): string {
  if (cmd.body.includes('$ARGUMENTS')) return cmd.body.replaceAll('$ARGUMENTS', args)
  return args ? `${cmd.body}\n\nTask: ${args}` : cmd.body
}

/**
 * Figure 2's chat surface. Like FigureChat, the conversation (messages, session
 * id, in-flight ask) lives in the ask-session store so navigating away doesn't
 * lose a reply; this component owns the slash-command palette and expansion.
 */
export function Figure2Workspace({ figure }: Props) {
  const {
    fig2: { messages, streaming, send: sendAsk, stop },
  } = useAskSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [pickedCommand, setPickedCommand] = useState<SlashCommand | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [commands, setCommands] = useState<SlashCommand[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastUserIdRef = useRef<string | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)
  // Guard against running the prefill effect twice. The deps (`commands`, `searchParams`)
  // can update independently, but the staging should happen exactly once per arrival
  // from a `?prefill=` URL. After staging, we strip the param so a refresh doesn't
  // re-stage and overwrite something the user has since typed.
  const prefillConsumedRef = useRef(false)

  // Same scroll behavior as FigureChat: pin a new user message or new assistant reply to the
  // top of the scroll viewport so reading starts from the first line, not the prior reply.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

    if (lastAssistant && lastAssistant.id !== lastAssistantIdRef.current) {
      lastAssistantIdRef.current = lastAssistant.id
      const el = messageRefs.current[lastAssistant.id]
      if (el) {
        container.scrollTo({ top: el.offsetTop - container.offsetTop - 8, behavior: 'smooth' })
      }
      return
    }
    if (lastUser && lastUser.id !== lastUserIdRef.current) {
      lastUserIdRef.current = lastUser.id
      const el = messageRefs.current[lastUser.id]
      if (el) {
        container.scrollTo({ top: el.offsetTop - container.offsetTop - 8, behavior: 'smooth' })
      }
    }
  }, [messages, streaming])

  // Load the live on-disk slash commands from .claude/commands/*.md so newly added commands
  // show up without a code change.
  useEffect(() => {
    listCommands()
      .then(setCommands)
      .catch(() => setCommands([]))
  }, [])

  // Handle `?prefill=/<command>[ args]` arrivals — used by figure 1's "not sure what to
  // try?" link. We need the commands list to have loaded before we can resolve the slash
  // token to a real command, so this effect runs once both `searchParams` and `commands`
  // are ready. Sets `input` to the prefilled string AND `pickedCommand` to the matched
  // command so the slash-expansion logic fires correctly on send.
  useEffect(() => {
    if (prefillConsumedRef.current) return
    if (commands.length === 0) return
    const prefill = searchParams?.get('prefill')
    if (!prefill) return
    prefillConsumedRef.current = true

    const trimmed = prefill.trim()
    setInput(trimmed)

    // Parse the slash invocation: `/<name>` or `/<name> <args>`. Look up the command by
    // name; if it exists, stage it as picked so the send pipeline treats this as a slash
    // command, not raw text.
    if (trimmed.startsWith('/')) {
      const tokenEnd = trimmed.indexOf(' ')
      const name = tokenEnd === -1 ? trimmed.slice(1) : trimmed.slice(1, tokenEnd)
      const match = commands.find((c) => c.name === name)
      if (match) setPickedCommand(match)
    }

    // Strip the param so a subsequent refresh doesn't re-stage and overwrite anything
    // the user has typed. Using `replace` keeps the page in history without adding a
    // new entry, and `{ scroll: false }` avoids jumping the viewport.
    router.replace('/learn/2', { scroll: false })
  }, [searchParams, commands, router])

  const showPalette = input.startsWith('/') && !streaming
  const paletteMatches = showPalette
    ? commands.filter((c) =>
        c.name.includes(input.slice(1).split(/\s/)[0].toLowerCase()),
      )
    : []

  // Real Claude Code expands /<name> into the command's body at send time but shows the
  // /<name> token in the transcript. Mirror that: stage `/${name}` in the textarea so the
  // user sees what they're about to invoke, not the whole .md file dumped inline.
  const pickCommand = (cmd: SlashCommand) => {
    setInput(`/${cmd.name}`)
    setPickedCommand(cmd)
    setPreviewOpen(false)
  }

  const send = useCallback(() => {
    if (!input.trim() || streaming) return
    const trimmed = input.trim()
    // If the input matches `/<picked-name>` or `/<picked-name> <args>`, expand it. The body
    // gets sent as the actual prompt.
    const usingSlash = (() => {
      if (!pickedCommand) return null
      const tokenOnly = `/${pickedCommand.name}`
      if (trimmed === tokenOnly) return { cmd: pickedCommand, args: '' }
      if (trimmed.startsWith(tokenOnly + ' ')) {
        return { cmd: pickedCommand, args: trimmed.slice(tokenOnly.length + 1).trim() }
      }
      return null
    })()
    const promptToSend = usingSlash ? expandCommand(usingSlash.cmd, usingSlash.args) : input
    const displayContent = usingSlash
      ? usingSlash.args
        ? `/${usingSlash.cmd.name} ${usingSlash.args}`
        : `/${usingSlash.cmd.name}`
      : input

    sendAsk({ prompt: promptToSend, display: displayContent, viaSlash: usingSlash?.cmd.name })
    setInput('')
    setPickedCommand(null)
    setPreviewOpen(false)
  }, [input, streaming, pickedCommand, sendAsk])

  const lastMessage = messages[messages.length - 1]
  // A user turn with no reply and nothing in flight = the ask was cut off by a full page
  // reload. Offer a one-click resend; a slash turn is re-expanded from the on-disk
  // commands list (the picked command didn't survive the reload).
  const interrupted = !streaming && lastMessage?.role === 'user'
  const resend = useCallback(() => {
    if (streaming || !lastMessage || lastMessage.role !== 'user') return
    const content = lastMessage.content
    if (content.startsWith('/')) {
      const tokenEnd = content.indexOf(' ')
      const name = tokenEnd === -1 ? content.slice(1) : content.slice(1, tokenEnd)
      const args = tokenEnd === -1 ? '' : content.slice(tokenEnd + 1).trim()
      const match = commands.find((c) => c.name === name)
      if (match) {
        sendAsk({
          prompt: expandCommand(match, args),
          display: content,
          viaSlash: match.name,
          append: false,
        })
        return
      }
    }
    sendAsk({ prompt: content, display: content, append: false })
  }, [streaming, lastMessage, commands, sendAsk])

  return (
    <div className="flex h-full flex-col gap-4">
      <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <ClaudeMessage>
            <ClaudeParagraph className="text-text-primary m-0 font-semibold">
              What is a slash command?
            </ClaudeParagraph>
            <ClaudeParagraph className="text-text-secondary m-0 mt-1">
              It&apos;s a shortcut. Someone on this project wrote a long, careful prompt and
              gave it a short name — now you can run that prompt by typing the short name
              instead of writing it out yourself. There are four set up here. Try typing{' '}
              <code>/</code> in the input below to see them.
            </ClaudeParagraph>

            <ClaudeParagraph className="text-text-primary m-0 mt-4 font-semibold">
              How to try one.
            </ClaudeParagraph>
            <ClaudeParagraph className="text-text-secondary m-0 mt-1">
              Type <code>/</code>, click one from the list, then send. Some commands ask you
              a follow-up question — answer it the same way you&apos;d answer a person, and
              Claude will pick up where you left off. The triangle is yours once you send a
              command.
            </ClaudeParagraph>

            <ClaudeParagraph className="text-text-tertiary text-xs m-0 mt-4">
              Curious how the commands are wired up? Each one lives as a markdown file in{' '}
              <code className="font-mono">.claude/commands/</code>. The filename becomes the
              slash (<code className="font-mono">explain-figure.md</code> →{' '}
              <code className="font-mono">/explain-figure</code>); the body becomes the prompt
              Claude actually receives.
            </ClaudeParagraph>
          </ClaudeMessage>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
              {m.viaSlash && (
                <div className="text-text-tertiary mb-1 mr-1 flex items-center justify-end gap-1 text-xs">
                  <Terminal className="size-3" />/{m.viaSlash}
                </div>
              )}
              <UserMessage text={m.content} />
            </div>
          ) : (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
              <ClaudeMessage>
                <ClaudeMarkdown text={m.content} />
              </ClaudeMessage>
            </div>
          ),
        )}
        {/* Chat transcripts get the large sketch — they have the vertical room. */}
        {streaming && <ThinkingState kind={figure.shape} tips={figure.tips} size={180} />}

        {interrupted && (
          <div className="border-border-subtle mx-4 my-2 flex items-center justify-between gap-3 rounded-md border border-dashed p-3 text-xs">
            <span className="text-text-secondary">
              This ask was interrupted before the reply arrived.
            </span>
            <Button size="sm" onClick={resend}>
              <RefreshCw className="size-3" />
              Resend
            </Button>
          </div>
        )}
      </div>

      <ShapeAwardBanner
        figureId={figure.id}
        kind={figure.shape}
        shapeLabel="Triangle"
        copy="Slash commands are just markdown files in .claude/commands/. The filename becomes the slash (research-dev.md → /research-dev). The body of the file becomes the prompt. Drop a new .md in that folder and it shows up here on reload — you can write your own."
      />

      {pickedCommand && previewOpen && (
        <div className="border-border-subtle bg-page rounded-md border p-3">
          <div className="text-text-tertiary mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.12em]">
            <span>This is what gets sent</span>
            <span className="font-mono normal-case tracking-normal">
              /{pickedCommand.name}.md
            </span>
          </div>
          <pre className="text-text-secondary scroll-area max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-[1.55]">
            {pickedCommand.body}
          </pre>
        </div>
      )}

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
          placeholder="Type / for commands, or just write something…"
          disabled={streaming}
          className="text-text-primary font-text placeholder:text-text-tertiary w-full resize-none border-none bg-transparent p-0 font-sans text-base leading-snug outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {pickedCommand ? (
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 text-xs"
            >
              {previewOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              <code className="font-mono">/{pickedCommand.name}</code> ready · see the prompt that ships
            </button>
          ) : (
            <span />
          )}
          {streaming ? (
            <Button size="icon" variant="primary" onClick={stop} aria-label="Stop">
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
