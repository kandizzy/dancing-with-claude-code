'use client'

import { useLearnStore } from '@/lib/learn-store'
import type { LevelId } from '@/lib/levels/types'
import { Check } from 'lucide-react'

type Props = {
  levelId: LevelId
  shapeLabel: string
  copy: string
}

export function ShapeAwardBanner({ levelId, shapeLabel, copy }: Props) {
  const { isCompleted } = useLearnStore()
  if (!isCompleted(levelId)) return null
  return (
    <div className="rounded-md border border-[color:var(--color-accent-strong)] bg-[color:var(--color-accent)]/5 p-4 text-sm">
      <div className="text-text-primary mb-1 flex items-center gap-2 font-semibold">
        <Check className="size-4" />
        {shapeLabel} earned
      </div>
      <p className="text-text-secondary m-0">{copy}</p>
    </div>
  )
}
