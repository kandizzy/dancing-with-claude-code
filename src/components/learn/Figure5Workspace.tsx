'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLearnStore } from '@/lib/learn-store'
import { ask, gitAction, gitStatus, readDiff, type GitStatus } from '@/lib/ai/client'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { Shape } from './Shape'
import { Button } from '@/components/ui'
import {
  ArrowRight,
  Check,
  Copy,
  GitBranch,
  GitCompareArrows,
  GitMerge,
  Loader2,
  Target,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import { FIGURE_5_EXTRA_SYSTEM } from '@/lib/figures/figure-5'
import type { FigureDefinition } from '@/lib/figures/types'
import { cn } from '@/lib/utils'

type Props = { figure: FigureDefinition }

type Step = 1 | 2 | 3 | 4 | 5

const STEP_TITLES: Record<Step, string> = {
  1: 'Branch',
  2: 'Scope',
  3: 'Ask',
  4: 'Diff',
  5: 'Decide',
}

const STARTER_GOALS = [
  'Add a confidence-score chip beside the detection',
  'Rename the webcam heading to “Detection studio”',
  'Add a low-light hint below the webcam',
]

export function Figure5Workspace({ figure }: Props) {
  const { awardShape, isCompleted } = useLearnStore()
  const completed = isCompleted(figure.id)

  const [step, setStep] = useState<Step>(1)
  const [goal, setGoal] = useState('')
  const [scope, setScope] = useState('')
  const [directive, setDirective] = useState('')
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)

  const [status, setStatus] = useState<GitStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branchError, setBranchError] = useState<string | null>(null)
  const [branchCreated, setBranchCreated] = useState(false)

  const [runningClaude, setRunningClaude] = useState(false)
  const [claudeOutput, setClaudeOutput] = useState<string | null>(null)
  const [claudeError, setClaudeError] = useState<string | null>(null)

  const [diffText, setDiffText] = useState<string | null>(null)
  const [loadingDiff, setLoadingDiff] = useState(false)

  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [decision, setDecision] = useState<'merged' | 'discarded' | null>(null)

  // Edit-directive modal state. Replaces the OS-level window.prompt that didn't match the
  // rest of the design system and couldn't handle multi-line text comfortably. Pattern
  // mirrors PromoteButton.tsx for consistency — same overlay, same Escape/scroll-lock
  // behavior, same card shape.
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState('')

  // Escape closes the edit modal.
  useEffect(() => {
    if (!editOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editOpen])

  // Lock body scroll while the modal is open so the page behind doesn't drift.
  useEffect(() => {
    if (!editOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editOpen])

  const branchName = `feature/${slugify(goal || 'unnamed-change')}`

  // Fetch current branch + clean state on mount so we can warn before any git mutation.
  useEffect(() => {
    gitStatus()
      .then((s) => {
        setStatus(s)
        if (!s.available) {
          setStatusError(
            'Git operations are dev-mode only — this figure needs the local dev server.',
          )
        }
      })
      .catch((e) => setStatusError((e as Error)?.message ?? 'failed to read git status'))
  }, [])

  const createBranch = useCallback(async () => {
    if (creatingBranch || branchCreated) return
    setCreatingBranch(true)
    setBranchError(null)
    const res = await gitAction('branch', branchName)
    setCreatingBranch(false)
    if (!res.ok) {
      setBranchError(res.error)
      return
    }
    setBranchCreated(true)
    setStatus((s) => (s ? { ...s, branch: branchName } : s))
  }, [creatingBranch, branchCreated, branchName])

  const refineDirective = useCallback(async () => {
    if (!goal.trim() || !scope.trim() || refining) return
    setRefining(true)
    setRefineError(null)
    setDirective('')
    try {
      const composed = `Branch: ${branchName}\nTarget (file or segment): ${scope.trim()}\nGoal of the change: ${goal.trim()}`
      const result = await ask({
        systemPrompt: FIGURE_5_EXTRA_SYSTEM,
        userPrompt: composed,
      })
      setDirective(result.text.trim())
    } catch (err) {
      setRefineError((err as Error)?.message ?? 'Request failed')
    } finally {
      setRefining(false)
    }
  }, [goal, scope, refining, branchName])

  const runClaude = useCallback(async () => {
    if (!directive.trim() || runningClaude) return
    setRunningClaude(true)
    setClaudeOutput(null)
    setClaudeError(null)
    try {
      const result = await ask({
        systemPrompt:
          'You are running against a real local Next.js prototype repo. Make exactly the change the user describes. Do not touch files outside the named target. Keep the change small and reversible. Reply with a short summary of what you changed.',
        userPrompt: directive,
      })
      setClaudeOutput(result.text.trim())
    } catch (err) {
      setClaudeError((err as Error)?.message ?? 'Claude run failed')
    } finally {
      setRunningClaude(false)
    }
  }, [directive, runningClaude])

  const loadDiff = useCallback(async () => {
    setLoadingDiff(true)
    try {
      const text = await readDiff()
      setDiffText(text ?? '')
    } finally {
      setLoadingDiff(false)
    }
  }, [])

  const decide = useCallback(
    async (kind: 'merged' | 'discarded') => {
      if (finalizing || decision != null) return
      setFinalizing(true)
      setFinalizeError(null)
      const res = await gitAction(kind === 'merged' ? 'merge' : 'discard', branchName)
      setFinalizing(false)
      if (!res.ok) {
        setFinalizeError(res.error)
        return
      }
      setDecision(kind)
      setStatus((s) => (s ? { ...s, branch: 'main' } : s))
      if (!completed) {
        awardShape(figure.id, figure.shape, kind)
      }
    },
    [finalizing, decision, branchName, completed, figure, awardShape],
  )

  const advance = (to: Step) => setStep(to)

  const fullReset = () => {
    setStep(1)
    setGoal('')
    setScope('')
    setDirective('')
    setRefineError(null)
    setBranchCreated(false)
    setBranchError(null)
    setClaudeOutput(null)
    setClaudeError(null)
    setDiffText(null)
    setFinalizeError(null)
    setDecision(null)
  }

  // Once a decision is made, render the send-off in place of the stepped walkthrough.
  if (decision != null) {
    return <Sendoff decision={decision} branchName={branchName} onReset={fullReset} />
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="scroll-area flex-1 overflow-y-auto pr-2">
        <p className="text-text-secondary mb-2 text-sm leading-relaxed">
          The &quot;I asked for one thing and Claude refactored everything&quot; story
          isn&apos;t solved by a better prompt — it&apos;s solved by a{' '}
          <strong>workflow</strong>. A branch is a sandbox you can throw away. Five beats.
          We&apos;ll actually do them, on this repo.
        </p>

        {status && (
          <div className="border-border-subtle bg-page mb-3 flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <GitBranch className="text-text-tertiary size-3.5" />
              <span className="text-text-secondary">on branch</span>
              <code className="text-text-primary font-mono">{status.branch ?? '?'}</code>
            </div>
            <span className="text-text-tertiary text-xs">
              {status.clean
                ? 'working tree clean'
                : 'uncommitted changes — they will carry onto the new branch'}
            </span>
          </div>
        )}

        {statusError && (
          <div className="border-border-subtle text-danger mb-3 rounded-md border p-3 text-xs">
            {statusError}
          </div>
        )}

        <Stepper step={step} onJump={setStep} unlockedTo={step} />

        {step === 1 && (
          <Beat
            n={1}
            icon={<GitBranch className="size-4" />}
            title="Branch — give the work its own sandbox"
            why="A branch is a parallel copy of the repo. Anything Claude does in it is contained. If it goes sideways you delete the branch and nothing in main was ever touched."
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
                What do you want to change? One sentence.
              </span>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
                placeholder="e.g. add a confidence-score chip beside the detection"
                className="text-text-primary border-border-subtle bg-page rounded-md border px-2 py-1.5 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {STARTER_GOALS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setGoal(s)}
                  className="border-border-subtle hover:bg-state-hover rounded-md border px-2 py-1 text-xs"
                >
                  {s}
                </button>
              ))}
            </div>

            {goal.trim() && (
              <div className="border-border-subtle bg-page rounded-md border p-3">
                <div className="text-text-tertiary mb-1 text-[10px] uppercase tracking-[0.12em]">
                  We&apos;ll run this for you
                </div>
                <CommandLine command={`git checkout -b ${branchName}`} />
                {branchCreated ? (
                  <p className="text-text-secondary m-0 mt-2 flex items-center gap-1.5 text-xs">
                    <Check className="size-3.5" /> Branch created. You&apos;re now on{' '}
                    <code className="font-mono">{branchName}</code>.
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      onClick={createBranch}
                      disabled={creatingBranch || !goal.trim()}
                      variant="primary"
                      size="sm"
                    >
                      {creatingBranch ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <GitBranch className="size-4" />
                      )}
                      Create branch
                    </Button>
                    {status?.clean === false && (
                      <span className="text-text-tertiary text-xs">
                        Heads up: your uncommitted edits will carry along.
                      </span>
                    )}
                  </div>
                )}
                {branchError && (
                  <p className="text-danger m-0 mt-2 text-xs">{branchError}</p>
                )}
              </div>
            )}

            <NavRow
              canAdvance={branchCreated}
              nextLabel="Scope it"
              onNext={() => advance(2)}
              blockedHint="Create the branch first."
            />
          </Beat>
        )}

        {step === 2 && (
          <Beat
            n={2}
            icon={<Target className="size-4" />}
            title="Scope — name the smallest target"
            why={`"Change the webcam" gives Claude permission to touch anything related. "In src/components/learn/WebcamPlayground.tsx, add a confidence-score chip — don't modify any other file" doesn't. Smaller is safer. You can always come back for a second branch.`}
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
                Which file or segment? Name one.
              </span>
              <textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={2}
                placeholder="e.g. src/components/learn/WebcamPlayground.tsx — beside the existing detection readout"
                className="text-text-primary border-border-subtle bg-page rounded-md border px-2 py-1.5 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
              />
            </label>

            <NavRow
              canAdvance={scope.trim().length > 0}
              nextLabel="Refine the directive"
              onNext={() => advance(3)}
              blockedHint="Name a file or segment first."
            />
          </Beat>
        )}

        {step === 3 && (
          <Beat
            n={3}
            icon={<Terminal className="size-4" />}
            title="Ask — compose, then run the scoped directive"
            why="Claude turns your goal + target into a tight directive that names the file explicitly and forbids drift. Then we run it on this branch. In your terminal you'd type `claude -p '<directive>'`; here we run it the same way through the Agent SDK — same directive, same shape of work."
          >
            <div className="border-border-subtle bg-page space-y-1 rounded-md border p-3 text-xs">
              <Row label="branch">
                <code className="font-mono">{branchName}</code>
              </Row>
              <Row label="target">
                <span className="text-text-secondary">{scope || '(empty)'}</span>
              </Row>
              <Row label="goal">
                <span className="text-text-secondary">{goal || '(empty)'}</span>
              </Row>
            </div>

            {!directive && (
              <Button
                onClick={refineDirective}
                disabled={!goal.trim() || !scope.trim() || refining}
                variant="primary"
              >
                {refining ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {refining ? 'Refining…' : 'Refine with Claude'}
              </Button>
            )}

            {refineError && (
              <div className="text-danger text-xs">Refine failed: {refineError}</div>
            )}

            {directive && (
              <>
                <div className="border-border-subtle bg-surface rounded-md border p-3">
                  <div className="text-text-tertiary mb-1 text-[10px] uppercase tracking-[0.12em]">
                    Scoped directive
                  </div>
                  <p className="text-text-primary m-0 whitespace-pre-wrap text-sm leading-relaxed">
                    {directive}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDraft(directive)
                      setEditOpen(true)
                    }}
                    className="text-text-tertiary hover:text-text-primary mt-2 text-xs underline-offset-2 hover:underline"
                  >
                    Edit before running
                  </button>
                </div>

                <div className="border-border-subtle bg-page rounded-md border p-3">
                  <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
                    Run on branch <code className="font-mono normal-case">{branchName}</code>
                  </div>
                  <CommandLine command={`claude -p "<the directive>"`} />
                  {claudeOutput == null ? (
                    <Button
                      onClick={runClaude}
                      disabled={runningClaude}
                      variant="primary"
                      className="mt-2"
                    >
                      {runningClaude ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Terminal className="size-4" />
                      )}
                      {runningClaude ? 'Claude is editing files…' : 'Run claude -p'}
                    </Button>
                  ) : (
                    <div className="border-border-soft bg-surface mt-2 rounded-md border p-3 text-xs">
                      <div className="text-text-tertiary mb-1 text-[10px] uppercase tracking-[0.12em]">
                        claude said
                      </div>
                      <p className="text-text-secondary m-0 whitespace-pre-wrap leading-relaxed">
                        {claudeOutput}
                      </p>
                    </div>
                  )}
                  {claudeError && (
                    <p className="text-danger m-0 mt-2 text-xs">{claudeError}</p>
                  )}
                </div>

                <NavRow
                  canAdvance={claudeOutput != null}
                  nextLabel="Show me the diff"
                  onNext={() => {
                    advance(4)
                    void loadDiff()
                  }}
                  blockedHint="Run the directive first."
                />
              </>
            )}
          </Beat>
        )}

        {step === 4 && (
          <Beat
            n={4}
            icon={<GitCompareArrows className="size-4" />}
            title="Diff — read what actually changed"
            why="The diff is the source of truth — not Claude's summary, not your hopes. If the diff touches files you didn't name in your directive, that's scope drift; if it changes things you didn't ask for in the named file, that's interpretation drift. Either way, better to catch it here than after merging."
          >
            <div className="flex items-center gap-2">
              <Button onClick={loadDiff} disabled={loadingDiff}>
                {loadingDiff ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitCompareArrows className="size-4" />
                )}
                {diffText == null ? 'Read the diff' : 'Reload diff'}
              </Button>
              <span className="text-text-tertiary text-xs font-mono">git diff</span>
            </div>

            {diffText != null && (
              <div className="border-border-subtle bg-page mt-2 rounded-md border">
                <div className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-3 py-1.5 text-xs">
                  <GitCompareArrows className="size-3" />
                  <span className="font-mono">git diff</span>
                </div>
                <pre className="scroll-area max-h-72 overflow-auto p-3 font-mono text-[11px] leading-[1.55]">
                  {diffText || '(no changes detected — claude may have skipped the edit)'}
                </pre>
              </div>
            )}

            <NavRow
              canAdvance={diffText != null}
              nextLabel="I read it — time to decide"
              onNext={() => advance(5)}
              blockedHint="Load the diff first."
            />
          </Beat>
        )}

        {step === 5 && (
          <Beat
            n={5}
            icon={<GitMerge className="size-4" />}
            title="Decide — merge or discard the whole branch"
            why="This is what branches give you that prompts can't: a clean discard. If the diff is right, merge. If anything is off — even one file — discard the whole branch. The sandbox makes this cheap."
          >
            <div className="flex flex-col gap-3">
              <div className="border-border-subtle bg-page rounded-md border p-3">
                <div className="text-text-tertiary mb-1 text-[10px] uppercase tracking-[0.12em]">
                  Merge — Claude did what you asked
                </div>
                <CommandLine command={`git checkout main && git merge ${branchName}`} />
                <Button
                  onClick={() => decide('merged')}
                  variant="primary"
                  className="mt-2"
                  disabled={finalizing}
                >
                  {finalizing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <GitMerge className="size-4" />
                  )}
                  Merge into main
                </Button>
              </div>

              <div className="border-border-subtle bg-page rounded-md border p-3">
                <div className="text-text-tertiary mb-1 text-[10px] uppercase tracking-[0.12em]">
                  Discard — Claude went sideways
                </div>
                <CommandLine command={`git checkout main && git branch -D ${branchName}`} />
                <Button onClick={() => decide('discarded')} className="mt-2" disabled={finalizing}>
                  {finalizing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Discard branch
                </Button>
              </div>

              {finalizeError && (
                <p className="text-danger m-0 text-xs">{finalizeError}</p>
              )}

              <p className="text-text-tertiary m-0 text-xs">
                Either choice earns the composite. Discarding is not failure — it&apos;s the cheap
                rollback the workflow exists to give you.
              </p>
            </div>
          </Beat>
        )}
      </div>

      <ShapeAwardBanner
        figureId={figure.id}
        shapeLabel="Composite"
        copy="You walked the five beats: branch, scope, ask, diff, decide. The composite isn't a single move — it's the rhythm of working with Claude on something you don't want refactored under you."
      />

      {/* Edit-directive modal. Opens from beat 3's "Edit before running" link. Pattern
          mirrors PromoteButton.tsx — same overlay, same card shape — so the prototype's
          two modals feel like one component family. */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setEditOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Edit the directive"
        >
          <div
            className="bg-surface border-border-subtle shadow-popover relative flex max-h-[90vh] w-full max-w-2xl flex-col gap-3 rounded-lg border p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-baseline justify-between gap-2">
              <h2 className="text-text-primary font-serif text-lg">Edit the directive</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Close"
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            </header>

            <p className="text-text-secondary m-0 text-xs leading-relaxed">
              Tighten the directive before you run it. Name the target file once, describe
              one change, forbid drift. Shorter is usually better.
            </p>

            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              autoFocus
              className="text-text-primary font-text border-border-subtle bg-page placeholder:text-text-tertiary min-h-[40vh] w-full resize-y rounded-md border p-3 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-text-tertiary hover:text-text-primary px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                onClick={() => {
                  setDirective(editDraft)
                  setEditOpen(false)
                }}
                disabled={!editDraft.trim()}
              >
                <Check className="size-4" />
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Sendoff({
  decision,
  branchName,
  onReset,
}: {
  decision: 'merged' | 'discarded'
  branchName: string
  onReset: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-8 text-center">
      <Shape kind="composite" size={180} earned animate="always" />

      <div className="flex flex-col gap-3">
        <h2 className="text-text-primary font-serif text-3xl m-0 leading-tight">
          You&apos;re ready to use Claude Code anywhere.
        </h2>
        <p className="text-text-secondary m-0 max-w-xl text-sm leading-relaxed">
          You just {decision === 'merged' ? 'merged' : 'discarded'}{' '}
          <code className="font-mono text-xs">{branchName}</code>{' '}
          {decision === 'merged'
            ? 'into main. That change is on disk in this very repo.'
            : 'and main was never touched. The branch is gone.'}{' '}
          You did the whole loop — branch, scope, ask, diff, decide — on a real codebase.
          These five moves work the same wherever Claude Code runs: terminal, desktop app,
          API, here. The surface is yours to pick. The moves are the lesson.
        </p>
      </div>

      <div className="border-border-subtle bg-page max-w-md rounded-md border p-3 text-left">
        <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
          From here — pick the surface that fits, and try the loop on something new
        </div>
        <CommandLine command="git checkout -b feature/your-next-thing" />
        <CommandLine command='claude -p "what you want, scoped to one file"' />
        <CommandLine command="git diff" />
        <CommandLine command="# merge or discard, just like you did here" />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onReset}>
          Walk through again
        </Button>
        <Link href="/" className="text-text-tertiary hover:text-text-primary text-sm">
          Back to all figures
        </Link>
      </div>
    </div>
  )
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 6)
      .join('-') || 'change'
  )
}

function Stepper({
  step,
  onJump,
  unlockedTo,
}: {
  step: Step
  onJump: (s: Step) => void
  unlockedTo: Step
}) {
  return (
    <div className="border-border-subtle bg-surface mb-3 flex items-stretch overflow-hidden rounded-md border">
      {([1, 2, 3, 4, 5] as Step[]).map((n, i) => {
        const isActive = n === step
        const isUnlocked = n <= unlockedTo
        return (
          <button
            key={n}
            type="button"
            disabled={!isUnlocked}
            onClick={() => isUnlocked && onJump(n)}
            className={cn(
              'flex-1 px-2 py-2 text-left text-xs transition-colors',
              isActive && 'bg-page text-text-primary font-semibold',
              !isActive && isUnlocked && 'text-text-secondary hover:bg-state-hover',
              !isUnlocked && 'text-text-tertiary cursor-not-allowed',
              i > 0 && 'border-border-soft border-l',
            )}
          >
            <span className="text-text-tertiary font-mono text-[10px]">{n}/5</span>{' '}
            {STEP_TITLES[n]}
          </button>
        )
      })}
    </div>
  )
}

function Beat({
  n,
  icon,
  title,
  why,
  children,
}: {
  n: Step
  icon: React.ReactNode
  title: string
  why: string
  children: React.ReactNode
}) {
  return (
    <div className="border-border-subtle bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="text-text-tertiary font-mono text-xs">{n}/5</span>
        {icon}
        <h3 className="text-text-primary m-0 font-serif text-lg">{title}</h3>
      </div>
      <p className="text-text-tertiary m-0 text-xs leading-relaxed">{why}</p>
      {children}
    </div>
  )
}

function NavRow({
  canAdvance,
  nextLabel,
  onNext,
  blockedHint,
}: {
  canAdvance: boolean
  nextLabel: string
  onNext: () => void
  blockedHint?: string
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {!canAdvance && blockedHint && (
        <span className="text-text-tertiary text-xs italic">{blockedHint}</span>
      )}
      <Button onClick={onNext} disabled={!canAdvance} variant="primary">
        {nextLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] items-baseline gap-3">
      <span className="text-text-tertiary text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </span>
      <div className="text-text-primary text-xs">{children}</div>
    </div>
  )
}

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div className="bg-page flex items-start gap-2 rounded font-mono text-xs leading-relaxed">
      <span className="text-text-tertiary select-none">$</span>
      <code className="text-text-primary flex-1 whitespace-pre-wrap break-all">{command}</code>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy command"
        className="text-text-tertiary hover:text-text-primary shrink-0"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
