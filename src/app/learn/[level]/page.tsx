'use client'

import { notFound, useParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { getLevel } from '@/lib/levels/registry'
import { LevelChat } from '@/components/learn/LevelChat'
import { ClaudeMdAuthor } from '@/components/learn/ClaudeMdAuthor'
import { LearnHeader } from '@/components/learn/LearnHeader'
import type { UserEntry } from '@/lib/levels/types'
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
          All levels
        </Link>
        <h1 className="font-serif text-text-primary text-3xl">
          L{level.id}. {level.title}
        </h1>
        <p className="text-text-tertiary mt-1 text-sm">{level.capability}</p>
      </div>

      <p className="text-text-secondary max-w-prose text-base leading-relaxed">{level.intro}</p>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)]">
        <ClaudeMdAuthor highlightEntryId={matchedEntry?.id ?? null} className="min-h-0" />
        <div className="flex min-h-0 flex-col gap-3">
          <p className="text-text-primary font-medium">
            Task: <span className="text-text-secondary font-normal">{level.task}</span>
          </p>
          <LevelChat
            level={level}
            onMatchedEntry={setMatchedEntry}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  )
}
