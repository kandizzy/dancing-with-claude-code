'use client'

import { useState } from 'react'
import { ArrowDownToLine, Check, Copy, Terminal } from 'lucide-react'
import { Button } from '@/components/ui'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { handoffCommands } from '@/lib/repo'
import { cn } from '@/lib/utils'

type HandoffPanelProps = {
  /** The refined directive Claude returned in the browser. The user pastes this into their local claude session. */
  directive: string
  /** Awarded when the user submits the paste-back. */
  onLoopClosed: (pastedOutput: string) => void
  /** Already closed once — disable submission, keep the rendered output visible. */
  alreadyClosed?: boolean
  /** What the user pasted back last time (so it survives a re-render). */
  pastedOutput?: string | null
  className?: string
}

// Three blocks: clone+claude commands, the refined directive, and a paste-back textarea that
// closes the loop. The earn-the-shape moment is the paste-back submit.
export function HandoffPanel({
  directive,
  onLoopClosed,
  alreadyClosed = false,
  pastedOutput,
  className,
}: HandoffPanelProps) {
  return (
    <div
      className={cn(
        'border-border-subtle bg-surface flex flex-col gap-4 rounded-lg border p-4',
        className,
      )}
    >
      <div className="text-text-tertiary flex items-baseline justify-between text-xs">
        <span className="font-mono uppercase tracking-[0.12em]">Try this on your machine</span>
        <span className="italic">The arc/composite is earned when you come back with what Claude said.</span>
      </div>

      <Step n={1} label="Open the cloned repo in Claude Code">
        <CopyBlock content={handoffCommands()} ariaLabel="Setup commands" />
      </Step>

      <Step n={2} label="Paste this directive into your claude session">
        <CopyBlock content={directive} ariaLabel="Refined directive" />
      </Step>

      <Step n={3} label="Paste what Claude said back here to close the loop">
        <PasteBack
          onSubmit={onLoopClosed}
          alreadyClosed={alreadyClosed}
          pastedOutput={pastedOutput}
        />
      </Step>
    </div>
  )
}

function Step({
  n,
  label,
  children,
}: {
  n: number
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-text-secondary flex items-center gap-2 text-xs">
        <span className="border-border-subtle text-text-tertiary flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]">
          {n}
        </span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function CopyBlock({ content, ariaLabel }: { content: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="border-border-subtle bg-page relative overflow-hidden rounded-md border">
      <button
        type="button"
        aria-label={`Copy ${ariaLabel}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          } catch {
            // clipboard blocked — silent fallback
          }
        }}
        className="text-text-tertiary hover:text-text-primary absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-0.5 text-[10px]"
      >
        {copied ? (
          <>
            <Check className="size-3" />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-3" />
            Copy
          </>
        )}
      </button>
      <pre className="text-text-primary scroll-area max-h-48 overflow-auto whitespace-pre-wrap p-3 pr-20 font-mono text-[12px] leading-[1.55]">
        {content}
      </pre>
    </div>
  )
}

function PasteBack({
  onSubmit,
  alreadyClosed,
  pastedOutput,
}: {
  onSubmit: (text: string) => void
  alreadyClosed: boolean
  pastedOutput?: string | null
}) {
  const [draft, setDraft] = useState('')

  if (alreadyClosed && pastedOutput) {
    return (
      <div className="border-border-subtle bg-page rounded-md border p-3">
        <div className="text-text-tertiary mb-2 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]">
          <Terminal className="size-3" />
          From your terminal
        </div>
        <ClaudeMarkdown text={pastedOutput} className="text-[13px]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder="Paste here — a diff, a tool-use card, Claude's reply, whatever came back."
        className="text-text-primary font-text border-border-subtle bg-page placeholder:text-text-tertiary resize-y rounded-md border p-3 text-[13px] leading-[1.55] outline-none focus:border-[color:var(--color-accent-strong)]"
      />
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          onClick={() => {
            if (!draft.trim()) return
            onSubmit(draft)
          }}
          disabled={!draft.trim()}
        >
          <ArrowDownToLine className="size-4" />
          Close the loop
        </Button>
      </div>
    </div>
  )
}
