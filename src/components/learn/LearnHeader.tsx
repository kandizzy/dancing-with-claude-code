'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShapeTray } from './ShapeTray'
import { getLevel } from '@/lib/levels/registry'

export function LearnHeader() {
  const pathname = usePathname() ?? ''
  const sectionTitle = sectionTitleFor(pathname)

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <Link
          href="/"
          className="text-text-primary font-serif text-2xl leading-none tracking-tight"
        >
          Dancing with Claude
        </Link>
        {sectionTitle && (
          <>
            <span
              aria-hidden
              className="text-text-tertiary font-serif text-xl leading-none"
            >
              /
            </span>
            <span className="text-text-primary font-serif text-xl leading-none">
              {sectionTitle}
            </span>
          </>
        )}
      </div>
      <ShapeTray />
    </header>
  )
}

function sectionTitleFor(pathname: string): string | null {
  const match = pathname.match(/^\/learn\/(\d+)/)
  if (match) {
    const level = getLevel(Number(match[1]))
    return level?.title ?? null
  }
  return null
}
