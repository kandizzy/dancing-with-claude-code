'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { ask, gitAction, gitStatus, readDiff, isOverloadedError, isRateLimitError, type GitStatus } from '@/lib/ai/client'
import { ShapeAwardBanner } from './ShapeAwardBanner'
import { OverloadNotice } from './OverloadNotice'
import { ThinkingState } from './ThinkingState'
import { CommandLine } from './CommandLine'
import { Button, Modal } from '@/components/ui'
import {
  ArrowRight,
  Check,
  GitBranch,
  GitCompareArrows,
  GitMerge,
  Loader2,
  Target,
  Terminal,
  Trash2,
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

// Starter goals are paired with suggested scopes so the user (and the demo video)
// can advance without typing the file path from scratch. Each scope names a
// specific file in this repo so the directive Claude refines stays grounded.
const STARTERS: Array<{ goal: string; scope: string }> = [
  {
    goal: 'Add a confidence-score chip beside the detection',
    scope:
      'src/components/learn/WebcamPlayground.tsx — beside the existing detection readout, do not modify any other file',
  },
  {
    goal: 'Rename the webcam heading to “Detection studio”',
    scope:
      'src/components/learn/WebcamPlayground.tsx — the “the webcam” heading text only, no other file',
  },
  {
    goal: 'Add a low-light hint below the webcam',
    scope:
      'src/components/learn/WebcamPlayground.tsx — a small hint element beneath the webcam frame, no other file',
  },
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
  // When refineDirective hits a 529 or 429, render OverloadNotice with the
  // matching kind instead of the red refineError text. null = no transient.
  const [refineTransient, setRefineTransient] = useState<
    'overloaded' | 'rate-limit' | null
  >(null)

  const [status, setStatus] = useState<GitStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branchError, setBranchError] = useState<string | null>(null)
  const [branchCreated, setBranchCreated] = useState(false)
  // The branch the user was on when they created the F5 branch — merge/discard return
  // here. Not always `main`: a real user (or a student already working) may have started
  // from their own branch. Captured at branch-creation time.
  const [baseBranch, setBaseBranch] = useState<string | null>(null)

  const [runningClaude, setRunningClaude] = useState(false)
  const [claudeOutput, setClaudeOutput] = useState<string | null>(null)
  const [claudeError, setClaudeError] = useState<string | null>(null)
  // Same shape as refineTransient — transient error from the run call.
  const [runTransient, setRunTransient] = useState<
    'overloaded' | 'rate-limit' | null
  >(null)

  const [diffText, setDiffText] = useState<string | null>(null)
  const [loadingDiff, setLoadingDiff] = useState(false)

  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [decision, setDecision] = useState<'merged' | 'discarded' | null>(null)

  // Edit-directive modal state.
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    if (!editOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editOpen])

  useEffect(() => {
    if (!editOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editOpen])

  // Branch name: defaults to `feature/<slug-of-goal>` and tracks the goal as the user
  // types — until they edit the name field by hand, at which point it stops auto-syncing
  // and keeps whatever they wrote.
  const derivedBranchName = `feature/${slugify(goal || 'unnamed-change')}`
  const [branchName, setBranchName] = useState(derivedBranchName)
  const [branchNameEdited, setBranchNameEdited] = useState(false)
  useEffect(() => {
    if (!branchNameEdited) setBranchName(derivedBranchName)
  }, [derivedBranchName, branchNameEdited])

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
    // Capture the branch we're starting from — merge/discard will return here. If we're
    // on a detached HEAD there's no branch to return to, so refuse early with a clear note.
    const base = status?.branch ?? null
    if (!base || base === 'HEAD') {
      setBranchError(
        "Can't tell which branch you're on (detached HEAD). Check out a branch in your terminal first, then reload.",
      )
      return
    }
    setCreatingBranch(true)
    setBranchError(null)
    const res = await gitAction('branch', branchName)
    setCreatingBranch(false)
    if (!res.ok) {
      setBranchError(res.error)
      return
    }
    setBaseBranch(base)
    setBranchCreated(true)
    setStatus((s) => (s ? { ...s, branch: branchName } : s))
  }, [creatingBranch, branchCreated, branchName, status])

  const refineDirective = useCallback(async () => {
    if (!goal.trim() || !scope.trim() || refining) return
    setRefining(true)
    setRefineError(null)
    setRefineTransient(null)
    setDirective('')
    try {
      const composed = `Branch: ${branchName}\nTarget (file or segment): ${scope.trim()}\nGoal of the change: ${goal.trim()}`
      const result = await ask({
        systemPrompt: FIGURE_5_EXTRA_SYSTEM,
        userPrompt: composed,
        // Refine is pure text composition — no preset, no project context.
      })
      setDirective(result.text.trim())
    } catch (err) {
      // 529 and 429 get the calm notice treatment. Everything else falls
      // through to the red refineError text.
      if (isOverloadedError(err)) {
        setRefineTransient('overloaded')
      } else if (isRateLimitError(err)) {
        setRefineTransient('rate-limit')
      } else {
        setRefineError((err as Error)?.message ?? 'Request failed')
      }
    } finally {
      setRefining(false)
    }
  }, [goal, scope, refining, branchName])

  const runClaude = useCallback(async () => {
    if (!directive.trim() || runningClaude) return
    setRunningClaude(true)
    setClaudeOutput(null)
    setClaudeError(null)
    setRunTransient(null)
    try {
      const result = await ask({
        systemPrompt:
          "You are running against a real local Next.js prototype repo. The user has given you a scoped directive that names exactly one target file and one change. Use the Edit tool to actually make that change in the named file — do not just describe it, do not just propose it. After editing, reply with one short sentence summarizing the edit you made. Do not touch any file other than the one named in the directive.",
        userPrompt: directive,
        allowedTools: ['Edit', 'Read'],
        // The Run step actually edits files, so it needs the full agent
        // preset (TodoWrite, file planning) and project context (CLAUDE.md
        // for project conventions). This is the ONLY call site that uses
        // these.
        useClaudeCodePreset: true,
        loadProjectContext: true,
      })
      setClaudeOutput(result.text.trim())
    } catch (err) {
      if (isOverloadedError(err)) {
        setRunTransient('overloaded')
      } else if (isRateLimitError(err)) {
        setRunTransient('rate-limit')
      } else {
        setClaudeError((err as Error)?.message ?? 'Claude run failed')
      }
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
      const res = await gitAction(
        kind === 'merged' ? 'merge' : 'discard',
        branchName,
        baseBranch ?? undefined,
      )
      if (!res.ok) {
        setFinalizing(false)
        setFinalizeError(friendlyGitError(res.error))
        return
      }
      // The page owns the pause before the reward overlay (a 1000ms timer
      // after the fifth shape is awarded). No artificial delay here — the
      // button spinner already gave the click feedback.
      setFinalizing(false)
      setDecision(kind)
      setStatus((s) => (s ? { ...s, branch: baseBranch ?? s.branch } : s))
      if (!completed) {
        // Evidence encodes both the decision and the branch name so the
        // send-off (rendered at the page level) can show the punchy
        // figure-5-specific copy with the actual branch name regardless of
        // which figure the user navigates to next. Format: "merged:<branch>"
        // or "discarded:<branch>".
        awardShape(figure.id, figure.shape, `${kind}:${branchName}`)
      }
    },
    [finalizing, decision, branchName, baseBranch, completed, figure, awardShape],
  )

  const pickStarterGoal = useCallback((starter: typeof STARTERS[number]) => {
    setGoal(starter.goal)
    setBranchNameEdited(false)
    setBaseBranch(null)
    setScope(starter.scope)
    setDirective('')
    setRefineError(null)
    setRefineTransient(null)
    setBranchCreated(false)
    setBranchError(null)
    setClaudeOutput(null)
    setClaudeError(null)
    setRunTransient(null)
    setDiffText(null)
  }, [])

  const advance = (to: Step) => setStep(to)

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
            why="A branch is a parallel copy of the repo. Anything Claude does in it is contained. If it goes sideways you delete the branch and the branch you started from was never touched."
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
              {STARTERS.map((s) => (
                <button
                  key={s.goal}
                  type="button"
                  onClick={() => pickStarterGoal(s)}
                  className="border-border-subtle hover:bg-state-hover rounded-md border px-2 py-1 text-xs"
                >
                  {s.goal}
                </button>
              ))}
            </div>

            {goal.trim() && (
              <div className="border-border-subtle bg-page rounded-md border p-3">
                {!branchCreated && (
                  <label className="mb-2 flex flex-col gap-1">
                    <span className="text-text-tertiary text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Branch name
                    </span>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => {
                        setBranchNameEdited(true)
                        setBranchName(e.target.value)
                      }}
                      spellCheck={false}
                      className="text-text-primary border-border-subtle bg-surface rounded-md border px-2 py-1 font-mono text-xs outline-none focus:border-[color:var(--color-accent-strong)]"
                    />
                    <span className="text-text-tertiary text-[10px]">
                      Defaults to <code className="font-mono">feature/&lt;your-goal&gt;</code> —
                      a common convention. Edit it to anything you like.
                    </span>
                  </label>
                )}
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
              <>
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
                  Refine with Claude
                </Button>
                {refining && (
                  <ThinkingState
                    kind={figure.shape}
                    tips={figure.tips}
                    label="refining your directive…"
                  />
                )}
              </>
            )}

            {/* Transient error notice for the refine call (529 or 429).
               Takes precedence over the red refineError text; they can't be
               set at once because refineDirective clears each before trying. */}
            {refineTransient && (
              <OverloadNotice
                kind={refineTransient}
                onRetry={refineDirective}
                retrying={refining}
              />
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
                      Run claude -p
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
                  {/* One wait rule: the button spinner acknowledges the click; ThinkingState
                      alone narrates the wait. */}
                  {runningClaude && (
                    <ThinkingState
                      kind={figure.shape}
                      tips={figure.tips}
                      label="claude is editing files…"
                    />
                  )}
                  {/* Transient error notice for the run-claude-p call. */}
                  {runTransient && (
                    <div className="mt-2">
                      <OverloadNotice
                        kind={runTransient}
                        onRetry={runClaude}
                        retrying={runningClaude}
                      />
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
                <CommandLine
                  command={`git checkout ${baseBranch ?? 'main'} && git merge ${branchName}`}
                />
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
                  Merge into {baseBranch ?? 'main'}
                </Button>
              </div>

              <div className="border-border-subtle bg-page rounded-md border p-3">
                <div className="text-text-tertiary mb-1 text-[10px] uppercase tracking-[0.12em]">
                  Discard — Claude went sideways
                </div>
                <CommandLine
                  command={`git checkout ${baseBranch ?? 'main'} && git branch -D ${branchName}`}
                />
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
        kind={figure.shape}
        shapeLabel="Composite"
        copy="You walked the five beats: branch, scope, ask, diff, decide. The composite is the whole loop, not one move — it's how you keep Claude from refactoring everything under you."
      />

      {/* Edit-directive modal. */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit the directive"
        className="max-w-2xl max-h-[90vh]"
      >
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
      </Modal>
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

// Translate raw git stderr into something a learner can act on. The common one in
// practice: the repo already has unresolved merge conflicts, so `git checkout main`
// refuses ("you need to resolve your current index first" / "unmerged"). That's not
// an F5 bug — it's the working tree's pre-existing state — so we say so plainly.
function friendlyGitError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('resolve your current index') || lower.includes('unmerged')) {
    return 'Your working tree has unresolved merge conflicts from earlier work — git won’t switch branches until those are resolved. This isn’t about the branch you just made here; sort out the conflicts in your terminal (`git status`), then come back and decide.'
  }
  if (lower.includes('would be overwritten')) {
    return 'You have uncommitted changes that switching branches would overwrite. Commit or stash them in your terminal first, then come back and decide.'
  }
  return raw
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
