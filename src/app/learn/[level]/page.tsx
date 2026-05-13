'use client'

import { notFound, useParams } from 'next/navigation'
import { getLevel } from '@/lib/levels/registry'
import { LevelChat } from '@/components/learn/LevelChat'
import { Level2Workspace } from '@/components/learn/Level2Workspace'
import { Level3Workspace } from '@/components/learn/Level3Workspace'
import { Level4Workspace } from '@/components/learn/Level4Workspace'
import { Level5Workspace } from '@/components/learn/Level5Workspace'
import { ClaudeMdDrawer } from '@/components/learn/ClaudeMdDrawer'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { OnboardingCard } from '@/components/learn/OnboardingCard'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
import type { LevelDefinition } from '@/lib/levels/types'

export default function LevelPage() {
  const params = useParams<{ level: string }>()
  const levelId = Number(params.level)
  const level = getLevel(levelId)

  if (!level) {
    notFound()
    return null
  }

  const isFigure1 = level.id === 1

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 overflow-hidden px-6 py-6">
      <LearnHeader />

      <ClaudeMdDrawer />

      {isFigure1 && (
        <OnboardingCard storageKey="education-labs:onboard-figure-1">
          <p className="m-0">
            <strong className="text-text-primary font-semibold">
              Claude reads a file called <code className="font-mono text-xs">CLAUDE.md</code>{' '}
              before every reply.
            </strong>{' '}
            Open the bar above to read or edit it. The drawer pops open automatically when you
            add a note from a reply — and the next reply that draws on what you wrote earns you
            the circle.
          </p>
        </OnboardingCard>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {isFigure1 && <WebcamPlayground className="shrink-0" />}
        <Workspace level={level} />
      </div>
    </div>
  )
}

function Workspace({ level }: { level: LevelDefinition }) {
  switch (level.id) {
    case 1:
      return (
        <LevelChat
          level={level}
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
