'use client'

import { useEffect, useRef } from 'react'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
import { ResetProgressButton } from '@/components/learn/ResetProgressButton'
import { ClaudeMdDrawer } from '@/components/learn/ClaudeMdDrawer'
import { PlaygroundCoPilot } from '@/components/learn/PlaygroundCoPilot'
import { useLearnStore } from '@/lib/learn-store'
import { writeClaudeMd } from '@/lib/ai/client'

export default function Home() {
  const { claudeMd } = useLearnStore()
  const lastSyncedRef = useRef<string | null>(null)

  // Sync the in-browser CLAUDE.md to the on-disk file so `claude` reads what the user
  // authored. One-way (UI → disk), debounced via the dependency. Failures silent — we
  // might be in API mode / production where the route is unavailable.
  useEffect(() => {
    if (claudeMd === lastSyncedRef.current) return
    lastSyncedRef.current = claudeMd
    const timer = window.setTimeout(() => {
      writeClaudeMd(claudeMd).catch(() => {
        /* api mode or no on-disk route — ignore */
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [claudeMd])

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 overflow-hidden px-6 py-6">
      <LearnHeader />

      <ClaudeMdDrawer />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.1fr)]">
        <div className="flex min-h-0 flex-col gap-2">
          <WebcamPlayground />
          <p className="text-text-tertiary text-xs italic">
            Nothing leaves your browser. Detections are decoration; what you're learning is how
            to direct Claude about what's on the stage.
          </p>
        </div>

        <PlaygroundCoPilot className="min-h-0" />
      </div>

      <footer className="flex items-center justify-between gap-4">
        <span className="font-script text-text-tertiary text-sm italic">
          After Oskar Schlemmer · Bauhaus dances, 1922–1929
        </span>
        <ResetProgressButton />
      </footer>
    </div>
  )
}
