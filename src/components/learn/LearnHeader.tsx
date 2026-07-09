'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ShapeTray } from './ShapeTray'
import { figureLabel, getFigure } from '@/lib/figures/registry'
import { useAskSession } from '@/lib/ask-session-store'
import type { FigureId } from '@/lib/figures/types'

export function LearnHeader() {
  const pathname = usePathname() ?? ''
  const sectionTitle = sectionTitleFor(pathname)
  const isFigure = /^\/learn\/\d+/.test(pathname)
  const { pending } = useAskSession()
  const figureMatch = pathname.match(/^\/learn\/(\d+)/)
  const currentFigureId = figureMatch ? Number(figureMatch[1]) : null
  // An ask is running on a figure the user isn't looking at — say so, and link back.
  // (Asks survive navigation now; this is how the user finds their way back to the reply.)
  const workingElsewhere = pending != null && pending.figureId !== currentFigureId

  // Navigation grammar:
  //   The TITLE is the global home — always returns to the landing (/).
  //   The BACK ARROW (on figure pages only) is the contextual one-level-up —
  //   returns to the workshop floor (/home).
  // Different actions, different scopes.
  const titleHref = '/'

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        {/* Back-to-home arrow — visible on /learn/N pages so the user has a
            clear way back to the workshop floor. Not shown on / (no home to
            go back to) or /home (you are already there). */}
        {isFigure && (
          <Link
            href="/home"
            aria-label="Back to home"
            className="text-text-tertiary hover:text-text-primary inline-flex items-center justify-center self-center"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <Link
          href={titleHref}
          className="text-text-primary font-serif text-2xl leading-none tracking-tight"
        >
          Dancing with Claude Code
        </Link>
        {sectionTitle && (
          <>
            <span
              aria-hidden
              className="text-text-tertiary font-serif text-xl leading-none"
            >
              /
            </span>
            <span className="text-text-primary font-serif text-xl leading-none">
              {sectionTitle}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {workingElsewhere && pending && (
          <Link
            href={`/learn/${pending.figureId}`}
            className="border-border-subtle bg-surface text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
          >
            <Loader2 className="size-3 animate-spin" />
            Claude is working on figure {pending.figureId}
          </Link>
        )}
        <ShapeTray />
      </div>
    </header>
  )
}

// "Figure N · title" — the number ties the header to the highlighted tray shape.
function sectionTitleFor(pathname: string): string | null {
  const match = pathname.match(/^\/learn\/(\d+)/)
  if (match) {
    const id = Number(match[1])
    return getFigure(id) ? figureLabel(id as FigureId) : null
  }
  return null
}
