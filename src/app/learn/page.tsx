import Link from 'next/link'
import { LEVELS } from '@/lib/levels/registry'
import { ShapeTray } from '@/components/learn/ShapeTray'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { Lock } from 'lucide-react'

export default function LearnLanding() {
  const levels = [1, 2, 3, 4, 5] as const

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
      <LearnHeader />

      <section>
        <h1 className="font-serif text-text-primary mb-2 text-3xl">Five shapes</h1>
        <p className="text-text-secondary max-w-prose text-base leading-relaxed">
          You've used Claude. This is about <em>directing</em> Claude — the small, specific moves
          that turn a chat partner into a workshop assistant. Each level is a single Claude-Code
          capability surveyed students said they didn't know they were missing. Use spatial
          intelligence (your webcam, a face detector) as the playground.
        </p>
        <p className="text-text-secondary mt-3 max-w-prose text-base leading-relaxed">
          You earn a shape when Claude's reply <em>proves</em> you used the capability — not when
          you click a button.
        </p>

        <div className="border-border-soft mt-8 flex items-center gap-4 rounded-lg border p-4">
          <ShapeTray />
          <p className="text-text-tertiary ml-auto text-xs">Progress saved in this browser.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {levels.map((id) => {
          const def = LEVELS[id]
          const locked = !def
          return (
            <div
              key={id}
              className="border-border-soft flex items-center gap-4 rounded-lg border p-4"
            >
              <div className="text-text-tertiary font-mono text-xs">L{id}</div>
              <div className="flex-1">
                <div className="text-text-primary font-medium">
                  {def?.title ?? 'Coming next'}
                </div>
                <div className="text-text-tertiary text-sm">
                  {def?.capability ?? 'Locked until this prototype ships level ' + id}
                </div>
              </div>
              {def ? (
                <Link
                  href={`/learn/${id}`}
                  className="text-text-primary border-border-subtle hover:bg-state-hover rounded-md border px-3 py-1.5 text-sm"
                >
                  Begin
                </Link>
              ) : (
                <Lock className="text-text-tertiary size-4" />
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
