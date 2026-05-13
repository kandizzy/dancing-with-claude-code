'use client'

import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { getLevel } from '@/lib/levels/registry'
import { LevelChat } from '@/components/learn/LevelChat'
import { Level2Workspace } from '@/components/learn/Level2Workspace'
import { Level3Workspace } from '@/components/learn/Level3Workspace'
import { Level4Workspace } from '@/components/learn/Level4Workspace'
import { Level5Workspace } from '@/components/learn/Level5Workspace'
import { ClaudeMdAuthor } from '@/components/learn/ClaudeMdAuthor'
import { LearnHeader } from '@/components/learn/LearnHeader'
import type { LevelDefinition, UserEntry } from '@/lib/levels/types'
import { ArrowLeft } from 'lucide-react'

export default function LevelPage() {
  const params = useParams<{ level: string }>()
  const levelId = Number(params.level)
  const level = getLevel(levelId)
  const [matchedEntry, setMatchedEntry] = useState<UserEntry | null>(null)

  if (!level) {
    notFound()
    return null
  }

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-6 px-6 py-8">
      <LearnHeader />

      <div>
        <Link
          href="/learn"
          className="text-text-tertiary hover:text-text-primary mb-2 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3" />
          All figures
        </Link>
        <div className="font-script text-[color:var(--color-accent)] text-xl leading-none">
          Figure {level.id}
        </div>
        <h1 className="font-serif text-text-primary mt-1 text-3xl">{level.title}</h1>
        <p className="text-text-tertiary mt-1 text-sm">{level.capability}</p>
      </div>

      <p className="text-text-secondary max-w-prose text-base leading-relaxed">{level.intro}</p>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)]">
        <ClaudeMdAuthor highlightEntryId={matchedEntry?.id ?? null} className="min-h-0" />
        <div className="flex min-h-0 flex-col gap-3">
          <p className="text-text-primary font-medium">
            Task: <span className="text-text-secondary font-normal">{level.task}</span>
          </p>
          <Workspace level={level} onMatched={setMatchedEntry} />
        </div>
      </div>
    </div>
  )
}

function Workspace({
  level,
  onMatched,
}: {
  level: LevelDefinition
  onMatched: (entry: UserEntry | null) => void
}) {
  switch (level.id) {
    case 1:
      return <LevelChat level={level} onMatchedEntry={onMatched} className="min-h-0 flex-1" />
    case 2:
      return <Level2Workspace level={level} />
    case 3:
      return <Level3Workspace level={level} />
    case 4:
      return <Level4Workspace level={level} />
    case 5:
      return <Level5Workspace level={level} />
    default:
      return null
  }
}
