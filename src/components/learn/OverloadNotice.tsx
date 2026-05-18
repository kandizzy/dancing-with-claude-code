'use client'

/**
 * Notice rendered when an API call hit a transient Anthropic 529 (capacity
 * overload). Replaces the red "Error: ..." banner that appears for generic
 * errors with a calmer, more honest framing — the platform is having a
 * moment, not the prototype.
 *
 * Used by the three API call sites in the prototype:
 *   - FigureChat (figure 2 notes Q&A)
 *   - Figure5Workspace's "Refine with Claude" step
 *   - Figure5Workspace's "Run claude -p" step
 *
 * The reviewer experience this is built for: hitting a 529, seeing this
 * message, clicking Retry, succeeding on the second attempt without
 * re-typing their question. Manual retry (rather than automatic) is
 * deliberate — it keeps the user in control during a known-bad period
 * rather than letting the UI spin forever.
 */

import { AlertCircle, RotateCw, Loader2 } from 'lucide-react'

type OverloadNoticeProps = {
  /** Called when the user clicks Retry. Should re-invoke the same API call
   *  with the same inputs that triggered the 529 in the first place. */
  onRetry: () => void
  /** Whether a retry is currently in flight. When true, the button is
   *  disabled and shows a spinner. */
  retrying?: boolean
  /** Optional compact variant for narrower contexts (chat bubble, inline
   *  workspace step). Default is the full block. */
  compact?: boolean
}

export function OverloadNotice({ onRetry, retrying = false, compact = false }: OverloadNoticeProps) {
  if (compact) {
    return (
      <div className="border-border-subtle bg-page inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
        <AlertCircle className="text-text-tertiary size-3.5 shrink-0" />
        <span className="text-text-secondary">Claude&apos;s API is at capacity.</span>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="text-text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
        >
          {retrying ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    )
  }

  return (
    <div className="border-border-subtle bg-page flex items-start gap-3 rounded-md border p-3 text-sm">
      <AlertCircle className="text-text-tertiary mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="text-text-primary m-0 font-medium">
          Claude&apos;s API is at capacity.
        </p>
        <p className="text-text-tertiary m-0 mt-1 text-xs leading-relaxed">
          This is a temporary platform-wide condition (HTTP 529), not a fault in this
          prototype or your account. The Anthropic API will recover on its own \u2014 usually
          within a minute or two. Click Retry to try the same request again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="text-text-primary border-border-subtle hover:bg-state-hover mt-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs disabled:opacity-50"
        >
          {retrying ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
          {retrying ? 'Retrying\u2026' : 'Retry'}
        </button>
      </div>
    </div>
  )
}
