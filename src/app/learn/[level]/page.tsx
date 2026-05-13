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
import { OnboardingCard } from '@/components/learn/OnboardingCard'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
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

  const isFigure1 = level.id === 1

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-5 px-6 py-6 overflow-hidden">
      <LearnHeader />

      <div>
        <Link
          href="/"
          className="text-text-tertiary hover:text-text-primary mb-2 inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3" />
          All figures
        </Link>
        <div className="font-script text-[color:var(--color-accent)] text-xl leading-none">
          Figure {level.id}
        </div>
        <h1 className="font-serif text-text-primary mt-1 text-2xl">{level.title}</h1>
      </div>

      {isFigure1 && (
        <>
          <OnboardingCard storageKey="education-labs:onboard-figure-1">
            <p className="m-0">
              <strong className="text-text-primary font-semibold">
                Claude reads a file called <code className="font-mono text-xs">CLAUDE.md</code>
                {' '}before every reply.
              </strong>{' '}
              Here it is, on the left. Edit anything. Claude will see your edits on the next ask —
              and the next reply that draws on what you wrote earns you the circle.
            </p>
          </OnboardingCard>

          <div className="flex items-start gap-4">
            <p className="font-script text-text-tertiary flex-1 self-center text-sm italic leading-snug">
              In Claude Code, you'd edit{' '}
              <code className="font-mono text-xs not-italic">CLAUDE.md</code> in your editor;
              Claude reads it from disk on each turn. This panel simulates that loop.
            </p>
            <WebcamPlayground className="w-[280px] shrink-0" />
          </div>
        </>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)]">
        <ClaudeMdAuthor highlightEntryId={matchedEntry?.id ?? null} className="min-h-0" />
        <div className="flex min-h-0 flex-col gap-3">
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
      return (
        <LevelChat
          level={level}
          onMatchedEntry={onMatched}
          suggestedPrompts={level.suggestedPrompts}
          className="min-h-0 flex-1"
        />
      )
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
