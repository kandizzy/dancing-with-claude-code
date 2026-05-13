import Link from 'next/link'
import { LEVELS } from '@/lib/levels/registry'
import { ShapeTray } from '@/components/learn/ShapeTray'
import { Shape } from '@/components/learn/Shape'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
import type { LevelId, ShapeKind } from '@/lib/levels/types'

const LEVEL_SHAPES: Record<LevelId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

export default function LearnLanding() {
  const levels = [1, 2, 3, 4, 5] as const

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col gap-8 overflow-y-auto px-6 py-10">
      <LearnHeader />

      <section>
        <h1 className="font-serif text-text-primary mb-3 text-4xl">Dancing with Claude</h1>
        <p className="text-text-secondary max-w-prose text-base leading-relaxed">
          A five-figure choreography for learning to direct Claude Code. Each figure surfaces one
          capability surveyed users frequently don't know they're missing — slash commands they
          never invoked, a CLAUDE.md they never edited, a tool call they auto-accepted. You earn
          a Bauhaus shape on each figure; the dancer takes form as you go.
        </p>
        <p className="text-text-secondary mt-3 max-w-prose text-base leading-relaxed">
          The score is your CLAUDE.md, and you write it as you dance. The figures are
          asynchronous — your score persists across them, and you can revisit any figure at any
          time.
        </p>
      </section>

      <section>
        <WebcamPlayground />
        <p className="text-text-tertiary mt-2 text-xs italic">
          The playground is the stage. Detections are decoration; what you're learning is how to
          direct Claude about what's on it.
        </p>
      </section>

      <div className="my-2 flex items-center gap-3">
        <div className="border-border-soft flex-1 border-t" />
        <span className="font-script text-[color:var(--color-accent)] text-xl">Pause —</span>
        <div className="border-border-soft flex-1 border-t" />
      </div>

      <section>
        <div className="border-border-soft mb-6 flex items-center gap-4 rounded-lg border p-4">
          <ShapeTray />
          <p className="text-text-tertiary ml-auto text-xs">Progress saved in this browser.</p>
        </div>

        <div className="flex flex-col gap-3">
          {levels.map((id) => {
            const def = LEVELS[id]
            return (
              <div
                key={id}
                className="border-border-soft flex items-center gap-4 rounded-lg border p-4"
              >
                <Shape kind={LEVEL_SHAPES[id]} size={40} earned={false} className="shrink-0" />
                <div className="flex-1">
                  <div className="font-script text-[color:var(--color-accent)] text-base leading-none">
                    Figure {id}
                  </div>
                  <div className="text-text-primary mt-1 font-medium">{def.title}</div>
                  <div className="text-text-tertiary mt-0.5 text-sm">{def.capability}</div>
                </div>
                <Link
                  href={`/learn/${id}`}
                  className="text-text-primary border-border-subtle hover:bg-state-hover rounded-md border px-3 py-1.5 text-sm"
                >
                  Begin
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <footer className="font-script text-text-tertiary pt-2 text-base italic">
        After Oskar Schlemmer · Bauhaus dances, 1922–1929
      </footer>
    </div>
  )
}
