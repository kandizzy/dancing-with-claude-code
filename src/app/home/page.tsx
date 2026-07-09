'use client'

import Link from 'next/link'
import { FIGURES, FIGURE_SHAPES } from '@/lib/figures/registry'
import { Shape } from '@/components/learn/Shape'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
import { ResetProgressButton } from '@/components/learn/ResetProgressButton'
import { useLearnStore } from '@/lib/learn-store'
import { ArrowRight } from 'lucide-react'
import type { FigureId } from '@/lib/figures/types'

// The workshop floor — webcam on the left, figure list on the right. This was
// previously the landing page at /. The new landing (at /) is a quieter
// Shapes-style overview with a "Let's begin" CTA that brings the user here.
export default function Home() {
  const { isCompleted } = useLearnStore()
  const figures: FigureId[] = [1, 2, 3, 4, 5]

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-5 overflow-hidden px-6 py-6">
      <LearnHeader />

      <p className="text-text-secondary max-w-3xl text-sm leading-relaxed">
        <strong className="text-text-primary">You already know the basic steps. Let&apos;s add some figures.</strong>{' '}
        The webcam on the left is a small working app — face detection in your browser,
        nothing leaving your tab. It&apos;s the project you&apos;ll practice on; the figures
        on the right teach you the moves for working on it with Claude: writing a CLAUDE.md,
        using slash commands, writing a directive instead of chatting, reading a diff before
        you accept, and keeping changes on a branch. Earn a shape per figure. Take any order.
      </p>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1.1fr)_minmax(0,_1fr)]">
        <div className="flex min-h-0 flex-col gap-2">
          <WebcamPlayground />
        </div>

        <div className="border-border-soft flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
          {figures.map((id) => {
            const def = FIGURES[id]
            return (
              <Link
                key={id}
                href={`/learn/${id}`}
                className="border-border-subtle bg-page hover:bg-state-hover group flex items-center gap-3 rounded-md border px-3 py-2.5"
              >
                <Shape
                  kind={FIGURE_SHAPES[id]}
                  size={32}
                  earned={isCompleted(id)}
                  animate="hover"
                  className="shrink-0"
                />
                <div className="text-text-primary min-w-0 flex-1 truncate text-sm font-medium">
                  {def.title}
                </div>
                <ArrowRight className="text-text-tertiary size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )
          })}
        </div>
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
