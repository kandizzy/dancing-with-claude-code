'use client'

/**
 * Notice rendered when an API call hit a transient/recoverable error.
 * Replaces the red "Error: ..." banner that appears for generic errors
 * with calmer, more honest framing.
 *
 * Two variants:
 *   - 'overloaded' (HTTP 529): Anthropic platform-wide capacity issue.
 *     Recovery: retry button, usually works within a minute.
 *   - 'rate-limit' (HTTP 429): this user's account hit a rate limit.
 *     Recovery: wait it out or check usage. No retry button since
 *     immediate retry won't help.
 *
 * Used by the three API call sites in the prototype:
 *   - FigureChat (figure 1 notes Q&A)
 *   - Figure5Workspace's "Refine with Claude" step
 *   - Figure5Workspace's "Run claude -p" step
 */

import { AlertCircle, RotateCw, Loader2, Clock } from 'lucide-react'

type OverloadNoticeProps = {
  /** Which error this notice represents. Default 'overloaded' for back-compat
   *  with existing call sites. */
  kind?: 'overloaded' | 'rate-limit'
  /** Called when the user clicks Retry. Only used in the 'overloaded' variant
   *  — rate limits don't get a retry button since immediate retry won't help. */
  onRetry?: () => void
  /** Whether a retry is currently in flight. When true, the button is
   *  disabled and shows a spinner. */
  retrying?: boolean
  /** Optional compact variant for narrower contexts (chat bubble, inline
   *  workspace step). Default is the full block. */
  compact?: boolean
}

export function OverloadNotice({
  kind = 'overloaded',
  onRetry,
  retrying = false,
  compact = false,
}: OverloadNoticeProps) {
  if (kind === 'rate-limit') {
    return <RateLimitBlock compact={compact} />
  }
  return <OverloadBlock onRetry={onRetry} retrying={retrying} compact={compact} />
}

function OverloadBlock({
  onRetry,
  retrying,
  compact,
}: {
  onRetry?: () => void
  retrying: boolean
  compact: boolean
}) {
  if (compact) {
    return (
      <div className="border-border-subtle bg-page inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
        <AlertCircle className="text-text-tertiary size-3.5 shrink-0" />
        <span className="text-text-secondary">Claude&apos;s API is at capacity.</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="text-text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
          >
            {retrying ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        )}
      </div >
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
          This is a temporary platform-wide condition (HTTP 529). The Anthropic API
          will recover on its own — usually within a minute or two. Click Retry to
          try the same request again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="text-text-primary border-border-subtle hover:bg-state-hover mt-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs disabled:opacity-50"
          >
            {retrying ? <Loader2 className="size-3 animate-spin" /> : <RotateCw className="size-3" />}
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}

function RateLimitBlock({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="border-border-subtle bg-page inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
        <Clock className="text-text-tertiary size-3.5 shrink-0" />
        <span className="text-text-secondary">
          You&apos;ve hit a rate limit on your account — wait a moment.
        </span>
      </div>
    )
  }

  return (
    <div className="border-border-subtle bg-page flex items-start gap-3 rounded-md border p-3 text-sm">
      <Clock className="text-text-tertiary mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="text-text-primary m-0 font-medium">Account rate limit reached.</p>
        <p className="text-text-tertiary m-0 mt-1 text-xs leading-relaxed">
          Your Anthropic account hit a rate limit (HTTP 429). Wait a minute and try
          again, or check your usage at platform.claude.com if it keeps happening.
        </p>
      </div >
    </div >
  )
}
