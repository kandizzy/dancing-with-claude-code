import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLevel } from '@/lib/levels/registry'
import { SMART_OBJECTS_CLAUDE_MD } from '@/lib/levels/level-1'
import { LevelChat } from '@/components/learn/LevelChat'
import { ClaudeMdCard } from '@/components/learn/ClaudeMdCard'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { ArrowLeft } from 'lucide-react'

type Params = { level: string }

export default async function LevelPage({ params }: { params: Promise<Params> }) {
  const { level: levelParam } = await params
  const levelId = Number(levelParam)
  const level = getLevel(levelId)
  if (!level) return notFound()

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-6 px-6 py-8">
      <LearnHeader />

      <div className="flex items-baseline justify-between">
        <div>
          <Link
            href="/learn"
            className="text-text-tertiary hover:text-text-primary mb-2 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3" />
            All levels
          </Link>
          <h1 className="font-serif text-text-primary text-3xl">
            L{level.id}. {level.title}
          </h1>
          <p className="text-text-tertiary mt-1 text-sm">{level.capability}</p>
        </div>
      </div>

      <p className="text-text-secondary max-w-prose text-base leading-relaxed">{level.intro}</p>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)]">
        <ClaudeMdCard
          content={SMART_OBJECTS_CLAUDE_MD}
          caption="attached to Claude's system prompt"
          className="min-h-0"
        />
        <div className="flex min-h-0 flex-col gap-3">
          <p className="text-text-primary font-medium">
            Task: <span className="text-text-secondary font-normal">{level.task}</span>
          </p>
          <LevelChat level={level} className="min-h-0 flex-1" />
        </div>
      </div>
    </div>
  )
}
