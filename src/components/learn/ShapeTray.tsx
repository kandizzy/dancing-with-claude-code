'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLearnStore } from '@/lib/learn-store'
import { Shape } from './Shape'
import { cn } from '@/lib/utils'
import type { LevelId, ShapeKind } from '@/lib/levels/types'
import type { ComponentProps } from 'react'

const LEVEL_SHAPES: Record<LevelId, ShapeKind> = {
  1: 'circle',
  2: 'triangle',
  3: 'arc',
  4: 'square',
  5: 'composite',
}

const FIGURE_TITLES: Record<LevelId, string> = {
  1: 'Figure 1 · CLAUDE.md authoring',
  2: 'Figure 2 · Slash command discovery',
  3: 'Figure 3 · Directive writing',
  4: 'Figure 4 · Tool-use review',
  5: 'Figure 5 · Scoped change',
}

type ShapeTrayProps = ComponentProps<'div'>

export function ShapeTray({ className, ...props }: ShapeTrayProps) {
  const { isCompleted } = useLearnStore()
  const pathname = usePathname()
  // Active figure id is parsed from /learn/<n>. On / it's null.
  const match = pathname?.match(/^\/learn\/(\d+)/)
  const activeId = match ? (Number(match[1]) as LevelId) : null

  return (
    <nav
      aria-label="Figures"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {([1, 2, 3, 4, 5] as LevelId[]).map((id) => {
        const isActive = id === activeId
        return (
          <Link
            key={id}
            href={`/learn/${id}`}
            aria-label={FIGURE_TITLES[id]}
            title={FIGURE_TITLES[id]}
            className={cn(
              'flex items-center justify-center rounded-full p-1 transition-colors',
              isActive
                ? 'bg-[color:var(--color-accent)]/10 ring-1 ring-[color:var(--color-accent-strong)]'
                : 'hover:bg-state-hover',
            )}
          >
            <Shape kind={LEVEL_SHAPES[id]} size={28} earned={isCompleted(id)} />
          </Link>
        )
      })}
    </nav>
  )
}
