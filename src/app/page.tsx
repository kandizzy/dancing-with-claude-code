'use client'

import Link from 'next/link'
import { FIGURES } from '@/lib/figures/registry'
import { Shape } from '@/components/learn/Shape'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { ResetProgressButton } from '@/components/learn/ResetProgressButton'
import { ArrowRight } from 'lucide-react'
import type { FigureId, ShapeKind } from '@/lib/figures/types'

const FIGURE_SHAPES: Record<FigureId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

// Landing page — five figures laid out as a row of Shapes-style cells with
// verb-led titles below, plus a single "Let's begin" CTA that takes the user
// to /home (the workshop floor). The figures here are ALWAYS shown in their
// earned + animated state — a preview of what the user is working toward.
// Actual earned/unearned state lives on /home and inside the /learn/N pages.
export default function Landing() {
  const figures: FigureId[] = [1, 2, 3, 4, 5]

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-8 overflow-hidden px-6 py-6">
      <LearnHeader />

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <div className="flex w-full flex-col items-center gap-3">
          <p className="font-script text-text-tertiary text-xl italic">
            The score before the dance
          </p>
          <h1 className="text-text-primary max-w-3xl text-center font-serif text-3xl leading-tight">
            Five moves for working with Claude Code, learned by doing.
          </h1>
        </div>

        {/* Figure cells — always rendered in the earned + animated state */}
        <div className="grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-5">
          {figures.map((id) => {
            const def = FIGURES[id]
            return (
              <FigureCell
                key={id}
                figureId={id}
                shape={FIGURE_SHAPES[id]}
                title={def.title}
              />
            )
          })}
        </div>

        <Link
          href="/home"
          className="bg-text-primary text-page hover:bg-text-secondary inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Let&apos;s begin
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <footer className="flex items-center justify-between gap-4">
        <span className="font-script text-text-tertiary text-sm italic">
          After Oskar Schlemmer · Bauhaus dances, 1922–1929
        </span>
        <ResetProgressButton />
      </footer>
    </div>
  )
}

// One figure cell: dashed pencil border, FIG.N label, the canonical shape
// rendered in its earned + animated state, and the verb-led title beneath.
// Matches the Shapes-tab visual grammar so the landing reads as a
// continuation of that score.
function FigureCell({
  figureId,
  shape,
  title,
}: {
  figureId: FigureId
  shape: ShapeKind
  title: string
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-border-subtle relative flex aspect-square w-full items-center justify-center rounded-sm border border-dashed">
        <span className="text-text-tertiary absolute left-3 top-2 font-mono text-[10px] uppercase tracking-widest">
          fig. {figureId}
        </span>
        <Shape kind={shape} size={86} earned animate="always" />
      </div>
      <p className="text-text-secondary text-center font-serif text-[13px] italic leading-snug">
        {title}
      </p>
    </div>
  )
}
