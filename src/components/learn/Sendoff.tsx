'use client'

/**
 * The final "send-off" screen shown after the user completes figure 5's
 * walkthrough — or, increasingly, viewed standalone via `/preview/sendoff`
 * so the dancer can be iterated on without running through all five figures.
 *
 * Extracted from `Figure5Workspace.tsx` so the dancer + closing copy can be
 * rendered in isolation. The original lives inline in the workspace as a
 * conditional render after `decision != null`; this file is the same body
 * lifted into a standalone component with explicit props.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import { Dancer } from '@/components/explore/Dancer'
import { Button } from '@/components/ui'

type Props = {
  /** Whether the user chose to merge or discard their branch. Affects the
   *  body copy. Preview route defaults to 'merged'. */
  decision: 'merged' | 'discarded'
  /** The branch name shown in the body copy. Preview defaults to a generic
   *  placeholder. */
  branchName: string
  /** Action for the "Walk through again" button. Preview can pass a no-op
   *  or a back-to-home redirect. */
  onReset: () => void
}

export function Sendoff({ decision, branchName, onReset }: Props) {
  return (
    // Cover the figure page area but leave the navbar visible at top. The page's
    // top padding (py-6 = 24px) plus the header content (≈56px) puts the navbar's
    // bottom edge around 80px from the viewport top — start the overlay there so
    // the back-arrow + title stay accessible during the send-off.
    <div className="fixed inset-x-0 bottom-0 top-[80px] z-40 flex items-center justify-center overflow-y-auto bg-[color:var(--color-page)] px-6 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-2">
        {/* Dancer at its natural size, the visual centerpiece on the left. */}
        <div className="flex items-center justify-center">
          <Dancer />
        </div>

        {/* Copy column on the right — heading, summary, follow-up commands, controls. */}
        <div className="flex flex-col items-start gap-6 text-left">
          <div className="flex flex-col gap-3">
            <h2 className="text-text-primary font-serif text-3xl m-0 leading-tight">
              You&apos;re ready to use Claude Code anywhere.
            </h2>
            <p className="text-text-secondary m-0 text-sm leading-relaxed">
              You just {decision === 'merged' ? 'merged' : 'discarded'}{' '}
              <code className="font-mono text-xs">{branchName}</code>{' '}
              {decision === 'merged'
                ? 'into main. That change is on disk in this very repo.'
                : 'and main was never touched. The branch is gone.'}{' '}
              You did the whole loop — branch, scope, ask, diff, decide — on a real
              codebase. These five moves work the same wherever Claude Code runs:
              terminal, desktop app, API, here. The surface is yours to pick. The moves
              are the lesson.
            </p>
          </div>

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
            <Button onClick={onReset}>Walk through again</Button>
            <Link href="/" className="text-text-tertiary hover:text-text-primary text-sm">
              Back to all figures
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline copy-to-clipboard command row. Duplicated from `Figure5Workspace.tsx`
 * (the original had it as an inner helper). When/if more places need this we
 * should lift it into a shared component; for now keeping it local to Sendoff
 * avoids over-extracting before there's a real second user.
 */
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
