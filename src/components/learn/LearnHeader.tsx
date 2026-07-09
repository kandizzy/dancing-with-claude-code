'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ShapeTray } from './ShapeTray'
import { figureLabel, getFigure } from '@/lib/figures/registry'
import type { FigureId } from '@/lib/figures/types'

export function LearnHeader() {
  const pathname = usePathname() ?? ''
  const sectionTitle = sectionTitleFor(pathname)
  const isFigure = /^\/learn\/\d+/.test(pathname)

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
      <ShapeTray />
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
