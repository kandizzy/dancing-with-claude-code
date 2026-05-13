import Link from 'next/link'
import { LEVELS } from '@/lib/levels/registry'
import { ShapeTray } from '@/components/learn/ShapeTray'
import { LearnHeader } from '@/components/learn/LearnHeader'

export default function LearnLanding() {
  const levels = [1, 2, 3, 4, 5] as const

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col gap-8 overflow-y-auto px-6 py-10">
      <LearnHeader />

      <section>
        <h1 className="font-serif text-text-primary mb-2 text-3xl">Five shapes</h1>
        <p className="text-text-secondary max-w-prose text-base leading-relaxed">
          You've used Claude. This is about <em>directing</em> Claude — the small, specific moves
          that turn a chat partner into a workshop assistant. Each level surfaces one Claude-Code
          capability users frequently don't know they're missing. The playground is a browser-side
          face detector; the lever is your CLAUDE.md.
        </p>
        <p className="text-text-secondary mt-3 max-w-prose text-base leading-relaxed">
          Levels are asynchronous — once you start, your CLAUDE.md persists across the rest, and
          you can revisit any level at any time.
        </p>

        <div className="border-border-soft mt-8 flex items-center gap-4 rounded-lg border p-4">
          <ShapeTray />
          <p className="text-text-tertiary ml-auto text-xs">Progress saved in this browser.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {levels.map((id) => {
          const def = LEVELS[id]
          return (
            <div
              key={id}
              className="border-border-soft flex items-center gap-4 rounded-lg border p-4"
            >
              <div className="text-text-tertiary font-mono text-xs">L{id}</div>
              <div className="flex-1">
                <div className="text-text-primary font-medium">{def.title}</div>
                <div className="text-text-tertiary text-sm">{def.capability}</div>
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
      </section>
    </div>
  )
}
