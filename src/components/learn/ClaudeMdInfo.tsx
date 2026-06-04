'use client'

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

/**
 * The single source of truth for *how Claude Code treats CLAUDE.md*, surfaced as a small,
 * dismissible popover. It's a component (not inline copy) so the same clarification can sit
 * wherever CLAUDE.md is shown — the Figure 1 author here, the drawer on figures 2–5 later —
 * and stay consistent across the app.
 *
 * The accurate point, and the reason this replaced "Claude reads this on every reply": the
 * file is loaded at *session start* and pinned for that session. Edits don't take effect until
 * a reload (/clear, /compact, restart). "Read on every reply" implied edits were live, which is
 * the exact misconception Figure 1 teaches against. The reload nudge in the chat teaches the
 * recovery in the moment; this popover is the calm, always-available explanation.
 */
export function ClaudeMdInfo({ className, ...props }: ComponentProps<'div'>) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Dismiss on Escape or a click outside the trigger+popover.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <div ref={wrapRef} className={cn('relative', className)} {...props}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-text-tertiary hover:text-text-secondary inline-flex items-center gap-1 text-xs"
      >
        <Info className="size-3.5" />
        How it loads
      </button>

      {open && (
        // z-40 so the popover floats above the figures-2–5 CLAUDE.md drawer panel (z-30)
        // when the drawer is open; harmless in the always-open Figure 1 author.
        <div
          role="dialog"
          aria-label="How CLAUDE.md loads"
          className="border-border-subtle bg-surface shadow-popover absolute right-0 top-full z-40 mt-1.5 w-72 rounded-lg border p-3 text-left normal-case"
        >
          <p className="text-text-primary m-0 mb-1.5 text-xs font-semibold not-italic">
            How CLAUDE.md loads
          </p>
          <p className="text-text-secondary m-0 text-xs font-normal not-italic leading-relaxed">
            Claude loads <code className="font-mono">CLAUDE.md</code> when a session{' '}
            <strong className="text-text-primary font-medium">starts</strong> and keeps it in
            context for every reply — but only the version it loaded. Edit it mid-session and the
            change won&apos;t apply until you reload: <code className="font-mono">/clear</code>,{' '}
            <code className="font-mono">/compact</code>, or restart.
          </p>
        </div>
      )}
    </div>
  )
}
