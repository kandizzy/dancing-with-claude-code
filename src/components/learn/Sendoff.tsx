'use client'

/**
 * The final reward screen. Lives at the figure-page level (not inside
 * Figure5Workspace) so it can appear on whichever figure earns the user's
 * fifth shape — students traverse the figures in any order, and the moment
 * should land wherever they happen to be.
 *
 * Gating happens in the page wrapper, not here: this component just renders.
 * The page checks `allFiveEarned && !sendoffSeen` and shows this overlay
 * when both are true.
 */

import { useRouter } from 'next/navigation'
import { Dancer } from '@/components/explore/Dancer'
import { Button } from '@/components/ui'
import { useLearnStore } from '@/lib/learn-store'
import { CommandLine } from './CommandLine'

type Props = {
  // 'merged' or 'discarded' if figure 5 has been completed (drives the
  // figure-5-specific copy when applicable). Null means the user completed
  // figure 5 earlier in some other path, or — extremely edge case — earned
  // all five somehow without a recorded decision. We still show the screen
  // with generic copy.
  decision: 'merged' | 'discarded' | null
  branchName: string | null
  // Called when the user dismisses the send-off. Marks the moment as seen
  // in the persisted store so returning to any figure shows the regular
  // workspace instead of this screen. The component handles navigation
  // itself based on which button the user clicks.
  onDismiss: () => void
  // True when the user reached this screen by clicking merge/discard right
  // now (local component state in Figure5Workspace). False when they're
  // arriving from a different figure that earned the last shape, or
  // returning after a previous decision. Drives whether the copy is
  // figure-5-specific or generic.
  justDecided: boolean
}

export function Sendoff({ decision, branchName, onDismiss, justDecided }: Props) {
  const router = useRouter()
  const { reset } = useLearnStore()
  // Figure-5-specific copy fires when the user just decided AND we know
  // the decision. branchName is nice-to-have — if absent we fall back to
  // "your branch" which still lands the punch. We only switch to the
  // generic five-moves recap when decision itself is missing.
  const useFigureFiveCopy = justDecided && decision != null

  // "Back to all figures" — dismiss the sendoff (so it won't reappear)
  // and head to /home, the figure list page.
  const handleBackToFigures = () => {
    onDismiss()
    router.push('/home')
  }

  // "Walk through again" — wipe progress and head to root. The reward is
  // earned by walking the loop; a fresh walk-through can earn it again.
  const handleWalkThroughAgain = () => {
    reset()
    router.push('/')
  }

  return (
    // Full-screen reward moment. Covers everything including the header — the
    // send-off has its own "Back to all figures" exit, so the user is never trapped.
    // overflow-y-auto so the content scrolls rather than clips on short viewports.
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[color:var(--color-page)] px-6 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-2">
        {/* The dancer — visual centerpiece. Bare (no Stage chrome), sized to the
            viewport so it never pushes the copy column off-screen. */}
        <div className="flex items-center justify-center">
          <Dancer bare svgClassName="h-auto w-auto max-h-[44vh] md:max-h-[60vh]" />
        </div>

        {/* Copy column on the right — heading, summary, follow-up commands, controls. */}
        <div className="flex flex-col items-start gap-6 text-left">
          <div className="flex flex-col gap-3">
            <h2 className="text-text-primary font-serif text-3xl m-0 leading-tight">
              {useFigureFiveCopy
                ? "You're ready to use Claude Code anywhere."
                : "All five shapes — you walked the whole thing."}
            </h2>
            <p className="text-text-secondary m-0 text-sm leading-relaxed">
              {useFigureFiveCopy ? (
                <>
                  You just {decision === 'merged' ? 'merged' : 'discarded'}{' '}
                  {branchName != null ? (
                    <code className="font-mono text-xs">{branchName}</code>
                  ) : (
                    'your branch'
                  )}{' '}
                  {decision === 'merged'
                    ? 'into main. That change is on disk in this very repo.'
                    : 'and main was never touched. The branch is gone.'}{' '}
                  You did the whole loop — branch, scope, ask, diff, decide — on a real
                  codebase. These five moves work the same wherever Claude Code runs:
                  terminal, desktop app, API, here. The surface is yours to pick. The moves
                  are the lesson.
                </>
              ) : (
                <>
                  Pin context in CLAUDE.md, lean on slash commands, scope a directive, read
                  the diff before it lands, branch the risky stuff. These five moves work
                  the same wherever Claude Code runs: terminal, desktop app, API, here. The
                  surface is yours to pick. The moves are the lesson.
                </>
              )}
            </p>
          </div >

          <div className="border-border-subtle bg-page w-full rounded-md border p-3 text-left">
            <div className="text-text-tertiary mb-2 text-[10px] uppercase tracking-[0.12em]">
              From here — pick the surface that fits, and try the loop on something new
            </div>
            <CommandLine command="git checkout -b feature/your-next-thing" />
            <CommandLine command='claude -p "what you want, scoped to one file"' />
            <CommandLine command="git diff" />
            <CommandLine command="# merge or discard, just like you did here" />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleBackToFigures} variant="primary">
              Back to all figures
            </Button>
            <button
              type="button"
              onClick={handleWalkThroughAgain}
              className="text-text-tertiary hover:text-text-primary text-sm"
            >
              Walk through again
            </button>
          </div >
        </div >
      </div >
    </div >
  )
}
