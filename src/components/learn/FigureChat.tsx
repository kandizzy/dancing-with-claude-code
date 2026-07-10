'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ClaudeMessage, ClaudeParagraph } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { UserMessage } from '@/components/chat/UserMessage'
import type { FigureDefinition } from '@/lib/figures/types'
import { useLearnStore } from '@/lib/learn-store'
import { useAskSession } from '@/lib/ask-session-store'
import { cn } from '@/lib/utils'
import { ArrowUp, FilePlus, HelpCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { PromoteButton } from './PromoteButton'
import { OverloadNotice } from './OverloadNotice'
import { ThinkingState } from './ThinkingState'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { Button } from '@/components/ui'

type FigureChatProps = {
  figure: FigureDefinition
  className?: string
}

// Concrete example notes the user can one-click add to ## Notes. Mix of plain-English
// preferences anyone can pick (the first two) and one slightly more technical one for
// users who want to see what a domain-specific note looks like. The deliberate range
// makes the page approachable for a non-CV reader without making it feel like the
// project is gatekeeping.
const STARTER_NOTES: Array<{ label: string; text: string }> = [
  {
    label: 'Explain things simply',
    text: "I'm new to this. When you explain something, use plain words first and the technical name second.",
  },
  {
    label: 'Show me before you change things',
    text: 'Before suggesting a code change, describe what the change will look like in plain language. I want to understand before you propose anything.',
  },
  {
    label: 'Be specific about numbers',
    text: 'If you recommend a number — a threshold, a delay, anything — say what would happen at a higher number and what would happen at a lower one. I want to learn the trade-off, not just take the value.',
  },
]

/**
 * Figure 1's chat surface. The conversation itself (messages, session, the ask
 * flows, and the reload progression) lives in the ask-session store so an
 * in-flight ask survives navigating away — this component is just the view:
 * input, scrolling, and the teaching banners.
 */
export function FigureChat({ figure, className }: FigureChatProps) {
  const { appendNote, setClaudeMdOpen, isCompleted } = useLearnStore()
  const {
    fig1: {
      messages,
      streaming,
      judging,
      staleAskPending,
      pendingError,
      send,
      reload,
      reask,
      clear,
    },
  } = useAskSession()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const lastUserIdRef = useRef<string | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)

  // When a new user message lands, pin it to the top of the scroll viewport so the user can
  // see their question at the top while Claude works below. When a new assistant reply
  // lands, snap the top of that reply into view so reading starts from the first line.
  // Dividers are ignored — they're not conversational turns.
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

  const handleSend = (text: string) => {
    if (!text.trim()) return
    send(text)
    setInput('')
  }

  const onPickStarter = (text: string) => {
    appendNote(text)
    setClaudeMdOpen(true)
  }

  const lastMessage = messages[messages.length - 1]
  const lastAssistant = messages.filter((m) => m.role === 'assistant').slice(-1)[0]
  const isEmpty = messages.length === 0
  // A user turn with no reply and nothing in flight = the ask was cut off by a full page
  // reload (route changes no longer interrupt asks — the store finishes them in the
  // background). Offer a one-click re-ask instead of leaving the question hanging.
  const interrupted =
    !streaming && !judging && !pendingError && lastMessage?.role === 'user'
  // The reload nudge wins over the generic follow-up nudge: when an ask ran stale, the reason
  // the note didn't land is staleness, not a too-general note, so don't tell them to reword.
  // All result banners wait for the gate verdict (!judging) so nothing flashes before it lands.
  const showReloadNudge = !streaming && !judging && staleAskPending
  const showFollowUpNudge =
    !streaming &&
    !judging &&
    !staleAskPending &&
    !interrupted &&
    lastAssistant &&
    !lastAssistant.matchedText &&
    !isCompleted(figure.id)

  return (
    <div className={cn('flex h-full flex-col gap-4', className)}>
      <div ref={scrollRef} className="scroll-area flex-1 overflow-y-auto pr-2">
        {isEmpty && (
          <>
            <ClaudeMessage>
              <ClaudeParagraph className="text-text-primary m-0 font-semibold">
                What is CLAUDE.md?
              </ClaudeParagraph>
              <ClaudeParagraph className="text-text-secondary m-0 mt-1">
                It&apos;s your project&apos;s standing instructions. Claude loads it when a
                session starts and keeps it in context for every reply — so anything you pin
                here shapes how Claude answers, not just in this conversation but every time
                someone runs Claude Code in this project. Most users never open it.
              </ClaudeParagraph>

              <ClaudeParagraph className="text-text-primary m-0 mt-4 font-semibold">
                How to try it.
              </ClaudeParagraph>
              <ClaudeParagraph className="text-text-secondary m-0 mt-1">
                Ask Claude anything about this project. When the reply says something
                worth keeping, hit <strong className="text-text-primary">Add to CLAUDE.md</strong>{' '}
                below the answer. Then ask a related follow-up — the reply that draws on your
                pinned note earns the circle.
              </ClaudeParagraph>

              <ClaudeParagraph className="text-text-tertiary text-xs m-0 mt-4">
                Curious how it works under the hood? CLAUDE.md is just a markdown file at the
                project root. The <code className="font-mono">## Notes</code> section is where
                your pinned notes land, and the whole file is loaded into Claude&apos;s context
                when a session starts — that&apos;s the trick.
              </ClaudeParagraph>
            </ClaudeMessage>

            <div className="border-border-subtle bg-page mt-3 rounded-lg border p-3">
              <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
                Don&apos;t have a preference yet? Borrow one of these.
              </div>
              <div className="flex flex-col gap-1.5">
                {STARTER_NOTES.map((n) => (
                  <button
                    key={n.label}
                    type="button"
                    onClick={() => onPickStarter(n.text)}
                    className="hover:bg-state-hover -mx-2 flex items-start gap-2 rounded-md px-2 py-1.5 text-left"
                  >
                    <FilePlus className="text-text-tertiary mt-0.5 size-3 shrink-0" />
                    <div className="flex-1">
                      <div className="text-text-primary text-sm font-medium">{n.label}</div>
                      <div className="text-text-tertiary text-xs leading-snug">{n.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
              <UserMessage text={m.content} />
            </div>
          ) : m.role === 'divider' ? (
            <div
              key={m.id}
              className="text-text-tertiary my-4 flex items-center gap-2"
              role="separator"
            >
              <div className="bg-border-subtle h-px flex-1" />
              <RefreshCw className="size-3 shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.12em]">{m.content}</span>
              <div className="bg-border-subtle h-px flex-1" />
            </div>
          ) : (
            <div
              key={m.id}
              ref={(el) => {
                messageRefs.current[m.id] = el
              }}
            >
              <ClaudeMessage>
                <ClaudeMarkdown text={m.content} highlight={m.highlightText ?? m.matchedText ?? null} />
              </ClaudeMessage>
              <div className="-mt-1 mb-3 flex items-center gap-3 pl-4">
                <PromoteButton sourceText={m.content} />
              </div>
            </div>
          ),
        )}

        {streaming && (
          <ThinkingState kind={figure.shape} tips={figure.tips} size={180} />
        )}

        {judging && (
          <div className="text-text-tertiary px-4 pb-1 text-xs">checking your notes…</div>
        )}

        {/* Transient error affordance — only shown when a send hit a 529 or
           429 AND a retry isn't currently in flight. Renders the right kind
           of notice based on which error fired. */}
        {pendingError && !streaming && (
          <div className="mt-3">
            <OverloadNotice
              kind={pendingError.kind}
              onRetry={() => handleSend(pendingError.text)}
            />
          </div>
        )}

        {interrupted && (
          <div className="border-border-subtle mx-4 my-2 flex items-center justify-between gap-3 rounded-md border border-dashed p-3 text-xs">
            <span className="text-text-secondary">
              This ask was interrupted before the reply arrived.
            </span>
            <Button size="sm" onClick={reask}>
              <RefreshCw className="size-3" />
              Re-ask
            </Button>
          </div>
        )}
      </div>

      <ShapeAwardBanner
        figureId={figure.id}
        kind={figure.shape}
        shapeLabel="Circle"
        copy="Claude just reused something you wrote. That's the whole trick — your CLAUDE.md is project context Claude loaded for this session, not just chatter from earlier in this conversation."
      />

      {/* The "let them feel it" moment. The reply just ran without their latest edit; name the
         real Claude Code gotcha and offer the reload that applies it. */}
      {showReloadNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-primary m-0 mb-1 font-serif text-base">
            Claude can&apos;t see that edit yet.
          </p>
          <p className="text-text-secondary m-0">
            That answer didn&apos;t use your latest CLAUDE.md edit — Claude can&apos;t see changes
            you make <em>after</em> a session starts. In Claude Code you&apos;d run{' '}
            <code className="font-mono">/clear</code>, <code className="font-mono">/compact</code>,
            or restart to reload the file. Same idea here:
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-3"
            onClick={reload}
            disabled={streaming}
          >
            <RefreshCw className="size-3.5" />
            Reload context
          </Button>
        </div>
      )}

      {showFollowUpNudge && (
        <div className="border-border-subtle rounded-md border p-4 text-sm">
          <p className="text-text-primary m-0 mb-1 font-serif text-base">
            No note landed this time.
          </p>
          <p className="text-text-secondary m-0">
            Either the question didn&apos;t touch any of your notes, or the notes are too general
            to land. Try adding a more specific one — or rewrite an existing note tighter — and
            ask again.
          </p>
        </div>
      )}

      <div className="border-border-subtle bg-surface relative rounded-xl border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(input)
            }
          }}
          rows={2}
          placeholder="Ask Claude anything about this project…"
          disabled={streaming}
          className="text-text-primary font-text placeholder:text-text-tertiary w-full resize-none border-none bg-transparent p-0 text-sm leading-snug outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Clear-conversation button — only shown when there's actually a
             conversation to clear. Sits opposite the Send button so it reads
             as a paired action: this side starts over, that side advances. */}
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              disabled={streaming}
              className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 text-xs disabled:opacity-50"
              aria-label="Clear conversation"
            >
              <Trash2 className="size-3" />
              Clear conversation
            </button>
          ) : (
            <span />
          )}
          <Button
            size="icon"
            variant="primary"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || streaming}
            aria-label="Send"
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Quiet escape hatch for users who don't know what to try. Sends them to figure 2
          with the input prefilled — slash commands live there, and /explain-figure 1
          is the project's own explanation of this figure. The figure 1 page is the only
          stuck-prone surface we've identified; if testers hit the same wall on other
          figures, the same pattern can be lifted in. */}
      <Link
        href={`/learn/2?prefill=${encodeURIComponent('/explain-figure 1')}`}
        className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1.5 self-start text-xs"
      >
        <HelpCircle className="size-3" />
        Not sure what to try? Ask the slash command in figure 2.
      </Link>
    </div>
  )
}
