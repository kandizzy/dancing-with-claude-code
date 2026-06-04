'use client'

import { useCallback, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { ask } from '@/lib/ai/client'
import { ClaudeMessage } from '@/components/chat/ClaudeMessage'
import { ClaudeMarkdown } from '@/components/chat/ClaudeMarkdown'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { ThinkingState } from './ThinkingState'
import { Button } from '@/components/ui'
import {
  ArrowUp,
  Check,
  Copy,
  Globe,
  Loader2,
  Monitor,
  Sparkles,
  Terminal,
} from 'lucide-react'
import { FIGURE_3_EXTRA_SYSTEM } from '@/lib/figures/figure-3'
import type { FigureDefinition } from '@/lib/figures/types'

type Props = { figure: FigureDefinition }

// Starter directives the user can one-click load into the form. Mix of UI changes a
// non-CV reader can confidently pick (the first two) and one CV-specific option so the
// pattern stays visible. The intro paragraph teaches the SHAPE of a good directive
// (scope/target/action); the starters give a non-expert real ways to fill it in.
const STARTERS: Array<{ label: string; scope: string; target: string; action: string }> = [
  {
    label: 'Rename the page heading',
    scope: 'the landing page',
    target: 'src/app/page.tsx',
    action:
      'Change the main heading from "Dancing with Claude Code" to "Working with Claude Code." Update only the heading text — do not touch the surrounding copy, links, or layout.',
  },
  {
    label: 'Add a footer link to the design notes',
    scope: 'the landing-page footer',
    target: 'src/app/page.tsx',
    action:
      'Add a small text link in the footer, between the Schlemmer credit and the Reset Progress button, that reads "About this project" and links to /about. Do not create the /about page yet — just add the link.',
  },
  {
    label: 'Add a confidence threshold slider',
    scope: 'the webcam UI',
    target: 'src/components/learn/WebcamPlayground.tsx',
    action:
      "Add a horizontal slider beneath the webcam frame that updates a `threshold` state (0.0–1.0), and wire it into the face detector's minDetectionConfidence option. Do not change anything else about the webcam project.",
  },
]

export function Figure3Workspace({ figure }: Props) {
  const { awardShape, isCompleted } = useLearnStore()
  const [scope, setScope] = useState('')
  const [target, setTarget] = useState('')
  const [action, setAction] = useState('')
  const [reply, setReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  // In-browser run state: a secondary affordance after the directive is refined. The
  // shape is awarded on directive submission, not on this run — running here is one of
  // several equivalent ways to apply the same directive (terminal, desktop, browser).
  const [running, setRunning] = useState(false)
  const [runOutput, setRunOutput] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const allFilled = scope.trim() && target.trim() && action.trim()
  const completed = isCompleted(figure.id)

  const send = useCallback(async () => {
    if (!allFilled || streaming) return
    const composed = `Scope: ${scope.trim()}\nTarget: ${target.trim()}\nAction: ${action.trim()}`
    setStreaming(true)
    setReply('')
    setRunOutput(null)
    try {
      const result = await ask({
        systemPrompt: FIGURE_3_EXTRA_SYSTEM,
        userPrompt: composed,
        // No project context needed — figure 3 is about directive composition,
        // not the project's own files. Saves CLAUDE.md from every refine call.
      })
      setReply(result.text)
      // Gate fires on the user's authored act — submitting a complete directive.
      // Composing the directive is the lesson; where they run it is their call.
      if (!completed) {
        awardShape(figure.id, figure.shape, `${scope.trim()} | ${target.trim()} | ${action.trim()}`)
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? 'Request failed'
      setReply(`Error: ${msg}`)
    } finally {
      setStreaming(false)
    }
  }, [allFilled, scope, target, action, streaming, figure, awardShape, completed])

  // Run the refined directive in the browser. Same Agent SDK call figure 5 uses for its
  // in-app run. No tools are allow-listed for this prototype (a teaching-surface
  // decision — figure 4 is where students learn to read diffs before edits land), so
  // Claude DESCRIBES what it would change rather than touching files on disk. That's
  // fine here: the lesson is the directive's shape, not whether the file mutates.
  const runHere = useCallback(async () => {
    if (!reply.trim() || running) return
    setRunning(true)
    setRunOutput(null)
    try {
      const result = await ask({
        systemPrompt:
          'You are running against a real local Next.js project. Read the named file, then describe in 2-3 sentences exactly what change you would make. Be specific about the lines you would modify. Do not actually edit anything — just describe the change so the user can compare it to what their terminal Claude Code would do.',
        userPrompt: reply,
        // Allow Read so Claude can look at the named file before describing the
        // change. Project context (CLAUDE.md) isn't needed here.
        allowedTools: ['Read'],
      })
      setRunOutput(result.text.trim())
    } catch (err) {
      setRunOutput(`Error: ${(err as Error)?.message ?? 'Run failed'}`)
    } finally {
      setRunning(false)
    }
  }, [reply, running])

  const copyForTerminal = useCallback(async () => {
    if (!reply.trim()) return
    try {
      await navigator.clipboard.writeText(`claude -p "${reply.trim().replace(/"/g, '\\"')}"`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be unavailable in some browser contexts; silent failure is fine.
    }
  }, [reply])

  const isEmpty = !scope.trim() && !target.trim() && !action.trim()

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        <p className="text-text-secondary mb-3 text-sm leading-relaxed">
          A directive names <strong>where</strong> (Scope), <strong>what</strong> (Target), and
          <strong> what one change</strong> (Action). It&apos;s the difference between &quot;make
          this better&quot; and &quot;rename the heading in src/app/page.tsx to &lsquo;Working
          with Claude.&rsquo;&quot; Sharper requests get sharper edits. The shape works the
          same wherever Claude Code runs.
        </p>

        {isEmpty && (
          <div className="border-border-subtle bg-page mb-3 rounded-lg border p-3">
            <div className="text-text-tertiary mb-2 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]">
              <Sparkles className="size-3" />
              Need a starter? Try one.
            </div>
            <div className="flex flex-col gap-1">
              {STARTERS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setScope(s.scope)
                    setTarget(s.target)
                    setAction(s.action)
                  }}
                  className="hover:bg-state-hover -mx-2 flex items-start gap-2 rounded-md px-2 py-1.5 text-left"
                >
                  <div className="flex-1">
                    <div className="text-text-primary text-sm font-medium">{s.label}</div>
                    <div className="text-text-tertiary truncate font-mono text-[11px]">
                      {s.target}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-border-subtle bg-surface flex flex-col gap-3 rounded-lg border p-4">
          <Field
            label="Scope"
            placeholder="What part of the project? (e.g. the landing page, the webcam UI)"
            value={scope}
            onChange={setScope}
          />
          <Field
            label="Target"
            placeholder="Which specific file? (e.g. src/app/page.tsx)"
            value={target}
            onChange={setTarget}
          />
          <Field
            label="Action"
            placeholder="What single change? (e.g. rename the heading from X to Y — don't touch anything else)"
            value={action}
            onChange={setAction}
            multiline
          />
        </div>

        {reply && (
          <>
            <ClaudeMessage>
              <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
                Your refined directive
              </div>
              <ClaudeMarkdown text={reply} />
            </ClaudeMessage>

            {/* "Where this works" — the surface-agnostic affordance that replaces the
                earlier "compose / run / paste back" beat bar. The point: this same
                directive applies in any surface where Claude Code runs. The student
                picks. The three slots are equal weight visually so nothing reads as
                "the right answer." */}
            <div className="border-border-subtle bg-page mt-3 rounded-lg border p-3">
              <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
                This directive works the same in any surface. Try it where it fits you.
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <SurfaceCard
                  icon={<Terminal className="size-4" />}
                  title="Your terminal"
                  body="The most universal home for Claude Code."
                  action={
                    <button
                      type="button"
                      onClick={copyForTerminal}
                      className="border-border-subtle hover:bg-state-hover text-text-secondary inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> Copy as <code className="font-mono">claude -p</code>
                        </>
                      )}
                    </button>
                  }
                />
                <SurfaceCard
                  icon={<Monitor className="size-4" />}
                  title="Desktop app"
                  body="Same directive, same result — paste into a new conversation."
                  action={
                    <span className="text-text-tertiary text-xs italic">
                      Open Claude Code on your desktop, paste the directive above.
                    </span>
                  }
                />
                <SurfaceCard
                  icon={<Globe className="size-4" />}
                  title="Run here"
                  body="Watch what Claude would do, in this tab. (Describes; doesn't edit.)"
                  action={
                    runOutput == null ? (
                      <Button
                        onClick={runHere}
                        disabled={running}
                        size="sm"
                      >
                        {running ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Globe className="size-3" />
                        )}
                        Run here
                      </Button>
                    ) : (
                      <span className="text-text-tertiary text-xs italic">Done — see below.</span>
                    )
                  }
                />
              </div>
            </div>

            {running && !runOutput && (
              <ThinkingState kind={figure.shape} tips={figure.tips} size={96} />
            )}
            {runOutput && (
              <div className="border-border-subtle bg-surface mt-3 rounded-md border p-3">
                <div className="text-text-tertiary mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]">
                  <Globe className="size-3" />
                  Claude said (in-browser run)
                </div>
                <p className="text-text-secondary m-0 whitespace-pre-wrap text-sm leading-relaxed">
                  {runOutput}
                </p>
                <p className="text-text-tertiary m-0 mt-2 text-xs italic">
                  The same directive in your terminal would actually edit the file, and
                  Claude would show you the diff before applying it (that&apos;s figure 4).
                  Here we just describe — the lesson on this page is the directive&apos;s
                  shape, not the edit.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <ShapeAwardBanner
        figureId={figure.id}
        shapeLabel="Arc"
        copy="You wrote a directive — scope, target, action — not a chat. That's the move, and it works the same wherever Claude Code runs. The terminal is one place. The desktop app is another. This tab is another. The shape is the lesson; pick the surface that fits your workflow."
      />

      <div className="flex items-center justify-end gap-2">
        {!allFilled && !streaming && (
          <span className="text-text-tertiary text-xs italic">
            Fill all three fields to send.
          </span>
        )}
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

// One "surface" slot in the where-this-works affordance. Three of these render in a row
// after the refined directive — same directive, three places it can run.
function SurfaceCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
    <div className="border-border-subtle bg-surface flex flex-col gap-1.5 rounded-md border p-2.5">
      <div className="text-text-primary flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        {title}
      </div>
      <p className="text-text-tertiary m-0 text-xs leading-snug">{body}</p>
      <div className="mt-1">{action}</div>
    </div>
  )
}
