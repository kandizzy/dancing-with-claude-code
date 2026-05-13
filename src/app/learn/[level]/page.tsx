'use client'

import { notFound, useParams } from 'next/navigation'
import { getLevel } from '@/lib/levels/registry'
import { LevelChat } from '@/components/learn/LevelChat'
import { Level2Workspace } from '@/components/learn/Level2Workspace'
import { Level3Workspace } from '@/components/learn/Level3Workspace'
import { Level4Workspace } from '@/components/learn/Level4Workspace'
import { Level5Workspace } from '@/components/learn/Level5Workspace'
import { ClaudeMdAuthor } from '@/components/learn/ClaudeMdAuthor'
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

  // Figure 1's whole point is CLAUDE.md authoring; the file stays the visual focus there.
  // Every other figure shows it ambient in the drawer at the top.
  if (level.id === 1) return <Figure1 />

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 overflow-hidden px-6 py-6">
      <LearnHeader />
      <ClaudeMdDrawer />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Workspace level={level} />
      </div>
    </div>
  )
}

function Figure1() {
  const level = getLevel(1)!

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 overflow-hidden px-6 py-6">
      <LearnHeader />

      <OnboardingCard storageKey="education-labs:onboard-figure-1">
        <p className="m-0">
          <strong className="text-text-primary font-semibold">
            Claude reads a file called <code className="font-mono text-xs">CLAUDE.md</code>{' '}
            before every reply.
          </strong>{' '}
          Here it is, on the left. Edit anything. Claude will see your edits on the next ask —
          and the next reply that draws on what you wrote earns you the circle.
        </p>
      </OnboardingCard>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)]">
        <ClaudeMdAuthor className="min-h-0" />
        <div className="flex min-h-0 flex-col gap-3">
          <WebcamPlayground className="shrink-0" />
          <LevelChat level={level} className="min-h-0 flex-1" />
        </div>
      </div>
    </div>
  )
}

function Workspace({ level }: { level: LevelDefinition }) {
  switch (level.id) {
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
