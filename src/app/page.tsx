import Link from 'next/link'
import { LEVELS } from '@/lib/levels/registry'
import { Shape } from '@/components/learn/Shape'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
import { ArrowRight } from 'lucide-react'
import type { LevelId, ShapeKind } from '@/lib/levels/types'

const LEVEL_SHAPES: Record<LevelId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

const PAUSE_AFTER = new Set<LevelId>([2, 4])

export default function Home() {
  const levels: LevelId[] = [1, 2, 3, 4, 5]

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-5 overflow-hidden px-6 py-6">
      <LearnHeader />

      <p className="text-text-secondary max-w-3xl text-sm leading-relaxed">
        A five-figure choreography for learning to direct Claude Code. The playground is the
        stage; your <code className="font-mono text-xs">CLAUDE.md</code> is the score you write
        as you dance. Figures are asynchronous — revisit any one, in any order.
      </p>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1.1fr)_minmax(0,_1fr)]">
        <div className="flex min-h-0 flex-col gap-2">
          <WebcamPlayground />
          <p className="text-text-tertiary text-xs italic">
            Nothing leaves your browser. Detections are decoration; what you're learning is how
            to direct Claude about what's on the stage.
          </p>
        </div>

        <div className="border-border-soft flex min-h-0 flex-col gap-1 overflow-y-auto rounded-lg border p-3">
          {levels.map((id) => {
            const def = LEVELS[id]
            return (
              <div key={id}>
                <Link
                  href={`/learn/${id}`}
                  className="border-border-subtle bg-page hover:bg-state-hover group flex items-center gap-3 rounded-md border px-3 py-2.5"
                >
                  <Shape kind={LEVEL_SHAPES[id]} size={32} earned={false} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-script text-[color:var(--color-accent)] text-base leading-none">
                      Figure {id}
                    </div>
                    <div className="text-text-primary truncate text-sm font-medium">
                      {def.title}
                    </div>
                  </div>
                  <ArrowRight className="text-text-tertiary size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {PAUSE_AFTER.has(id) && (
                  <div className="flex items-center gap-2 py-1 pl-3">
                    <span className="font-script text-[color:var(--color-accent)] text-sm">
                      Pause —
                    </span>
                    <div className="border-border-soft flex-1 border-t" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <footer className="font-script text-text-tertiary text-sm italic">
        After Oskar Schlemmer · Bauhaus dances, 1922–1929
      </footer>
    </div>
  )
}
