'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dancer } from '@/components/explore/Dancer'
import { EasingShowcase } from '@/components/explore/EasingShowcase'
import { SpinningShowcase } from '@/components/explore/SpinningShowcase'
import { cn } from '@/lib/utils'

type Tab = 'dancer' | 'easing' | 'spinning'

const TABS: Array<{ key: Tab; label: string; hint: string }> = [
  { key: 'dancer', label: 'Dancer', hint: 'the figure assembled from earned shapes' },
  { key: 'easing', label: 'Easing studio', hint: 'how a phrase reads with different curves' },
  { key: 'spinning', label: 'Spinning', hint: 'phase-locked rates · snap · anchor choice' },
]

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>('dancer')

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      <header className="flex items-baseline justify-between gap-6 border-b border-[var(--color-border-subtle)] px-8 py-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
            Sandbox · Iterative work
          </p>
          <h1 className="font-serif text-2xl leading-tight tracking-tight">
            SVG animation explorations
          </h1>
        </div>
        <Link
          href="/"
          className="font-mono text-[11px] text-[var(--color-ink-3)] underline-offset-4 hover:underline"
        >
          ← back to figures
        </Link>
      </header>

      <nav className="flex items-baseline gap-6 border-b border-[var(--color-border-subtle)] px-8 py-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'group flex items-baseline gap-3 border-b-2 pb-2 transition-colors',
              tab === t.key
                ? 'border-[var(--color-accent)]'
                : 'border-transparent hover:border-[var(--color-border-subtle)]',
            )}
          >
            <span
              className={cn(
                'font-serif text-lg leading-none',
                tab === t.key ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]',
              )}
            >
              {t.label}
            </span>
            <span
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.12em] transition-opacity',
                tab === t.key ? 'opacity-100 text-[var(--color-ink-3)]' : 'opacity-0 group-hover:opacity-70',
              )}
            >
              {t.hint}
            </span>
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">
          {tab === 'dancer' && <Dancer />}
          {tab === 'easing' && <EasingShowcase />}
          {tab === 'spinning' && <SpinningShowcase />}
        </div>
      </main>
    </div>
  )
}
