'use client'

import { useEffect, useRef, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import { getFigure } from '@/lib/figures/registry'
import { FigureChat } from '@/components/learn/FigureChat'
import { Figure2Workspace } from '@/components/learn/Figure2Workspace'
import { Figure3Workspace } from '@/components/learn/Figure3Workspace'
import { Figure4Workspace } from '@/components/learn/Figure4Workspace'
import { Figure5Workspace } from '@/components/learn/Figure5Workspace'
import { ClaudeMdAuthor } from '@/components/learn/ClaudeMdAuthor'
import { ClaudeMdDrawer } from '@/components/learn/ClaudeMdDrawer'
import { LearnHeader } from '@/components/learn/LearnHeader'
import { OnboardingCard } from '@/components/learn/OnboardingCard'
import { WebcamPlayground } from '@/components/learn/WebcamPlayground'
import { ApiKeyNotice } from '@/components/learn/ApiKeyNotice'
import { Sendoff } from '@/components/learn/Sendoff'
import { authStatus, type AuthStatus } from '@/lib/ai/client'
import { useLearnStore } from '@/lib/learn-store'
import type { FigureDefinition, FigureId } from '@/lib/figures/types'

// Which figures show the webcam in a side panel? The webcam is the example application
// the user practices on, so it earns a place only on figures that suggest modifying it.
// Figures 1 (CLAUDE.md authoring), 2 (slash commands), and 4 (diff review on CLAUDE.md)
// are about Claude Code mechanics, not the playground — the webcam would just distract.
// Figures 3 and 5 are about proposing real changes to the playground, so the user
// having the running app in their peripheral vision is load-bearing, not decorative.
const FIGURES_WITH_WEBCAM: ReadonlySet<FigureId> = new Set<FigureId>([3, 5])

export default function FigurePage() {
  const params = useParams<{ figure: string }>()
  const figureId = Number(params.figure)
  const figure = getFigure(figureId)

  // Fetch auth status once for the whole page — the same notice is shown
  // above every figure that calls the API, which is all of them. Lifted here
  // (rather than living in FigureChat) so figures 3, 4, and 5 also surface
  // the warning, since students can land on those out of order.
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  useEffect(() => {
    let cancelled = false
    authStatus().then((s) => {
      if (!cancelled) setAuth(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Send-off gate: lives at the page level (not inside Figure5Workspace) so
  // it can appear on whichever figure earns the user's fifth shape. Students
  // traverse the figures in any order — the moment should land wherever they
  // finish, not just on /learn/5.
  const { isCompleted, matchedAt, sendoffSeen, markSendoffSeen } = useLearnStore()
  const allFiveEarned =
    isCompleted(1) && isCompleted(2) && isCompleted(3) && isCompleted(4) && isCompleted(5)
  // Decision evidence from figure 5, if completed — drives the figure-5-
  // specific copy when applicable. Evidence is encoded as either bare
  // "merged"/"discarded" (older state) or "merged:<branch>"/"discarded:<branch>"
  // (newer state). Parse both shapes.
  const { figure5Decision, figure5Branch } = (() => {
    const evidence = matchedAt[5] ?? ''
    const [head, ...rest] = evidence.split(':')
    const tail = rest.join(':')
    if (head === 'merged' || head === 'discarded') {
      return {
        figure5Decision: head as 'merged' | 'discarded',
        figure5Branch: tail || null,
      }
    }
    return { figure5Decision: null, figure5Branch: null }
  })()
  // The page can't observe Figure5Workspace's local `decision` state, but
  // when the user has *just* completed figure 5 they're on /learn/5 and the
  // store update fires synchronously. We treat being on figure 5 with a
  // recorded decision as "just decided" — it produces the figure-5-specific
  // copy. From any other figure the user is arriving fresh after finishing
  // a different shape, so the generic five-moves recap is right.
  const sendoffJustDecided = figureId === 5 && figure5Decision != null

  // 1000ms delay before the overlay appears, so the shape-award banner has
  // time to play before the reward screen covers it. The delay only fires
  // on the transition from "not all earned" to "all earned" — reloading a
  // page where the conditions are already true shows the overlay
  // immediately, since no badge animation is playing in that case.
  // The timer is cleared on unmount, so navigating away during the window
  // cancels the send-off entirely — you won't see the dancer flash.
  const [sendoffReady, setSendoffReady] = useState(false)
  const wasAllEarnedRef = useRef<boolean | null>(null)
  useEffect(() => {
    // On the very first render, just record the current state — no animation
    // is playing, so if it's already true we want the overlay immediately.
    if (wasAllEarnedRef.current === null) {
      wasAllEarnedRef.current = allFiveEarned
      if (allFiveEarned) setSendoffReady(true)
      return
    }
    // Transition from false → true: badge just landed, wait 1000ms before
    // the overlay covers it.
    if (!wasAllEarnedRef.current && allFiveEarned) {
      wasAllEarnedRef.current = true
      const timer = window.setTimeout(() => setSendoffReady(true), 1000)
      return () => window.clearTimeout(timer)
    }
    // Any other transition (true → true on re-render, or true → false after
    // a reset): keep readiness in sync immediately.
    wasAllEarnedRef.current = allFiveEarned
    setSendoffReady(allFiveEarned)
  }, [allFiveEarned])

  const showSendoff = sendoffReady && !sendoffSeen

  if (!figure) {
    notFound()
    return null
  }

  // Figure 1's whole point is CLAUDE.md authoring; the file itself is the visual focus.
  // Different page layout from every other figure, so it gets its own component.
  if (figure.id === 1) {
    return (
      <>
        <Figure1 auth={auth} />
        {showSendoff && (
          <Sendoff
            decision={figure5Decision}
            branchName={figure5Branch}
            onDismiss={markSendoffSeen}
            justDecided={sendoffJustDecided}
          />
        )}
      </>
    )
  }

  const showWebcam = FIGURES_WITH_WEBCAM.has(figure.id as FigureId)

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 overflow-hidden px-6 py-6">
      <LearnHeader />
      <ClaudeMdDrawer />
      <ApiKeyNotice status={auth} />
      {showWebcam ? (
        // Two-column layout: workspace on the left, webcam as ambient context on the right.
        // The workspace already manages its own scroll container internally, so we just
        // give it a sized cell to live in and the webcam takes its natural shape next to it.
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1.4fr)_minmax(0,_1fr)]">
          <div className="flex min-h-0 flex-col">
            <Workspace figure={figure} />
          </div>
          <div className="hidden min-h-0 flex-col lg:flex">
            <WebcamPlayground className="shrink-0" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Workspace figure={figure} />
        </div>
      )}
      {showSendoff && (
        <Sendoff
          decision={figure5Decision}
          branchName={figure5Branch}
          onDismiss={markSendoffSeen}
          justDecided={sendoffJustDecided}
        />
      )}
    </div>
  )
}

function Figure1({ auth }: { auth: AuthStatus | null }) {
  const figure = getFigure(1)!

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 overflow-hidden px-6 py-6">
      <LearnHeader />

      <OnboardingCard storageKey="education-labs:onboard-figure-1">
        <p className="m-0">
          <strong className="text-text-primary font-semibold">
            Claude reads <code className="font-mono text-xs">CLAUDE.md</code> before every
            reply.
          </strong>{' '}
          Anything you pin here is project context for the next ask. Earn the circle when
          Claude&apos;s reply reuses something you wrote.
        </p>
      </OnboardingCard>

      <ApiKeyNotice status={auth} />

      {/* The webcam used to live here in a third column, but it pulled attention away from
          the CLAUDE.md lesson. This figure isn't about the playground — it's about the file
          Claude reads on every reply. Cleaner with just author + chat. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)]">
        <ClaudeMdAuthor className="min-h-0" />
        <FigureChat figure={figure} className="min-h-0" />
      </div>
    </div>
  )
}

function Workspace({ figure }: { figure: FigureDefinition }) {
  switch (figure.id) {
    case 2:
      return <Figure2Workspace figure={figure} />
    case 3:
      return <Figure3Workspace figure={figure} />
    case 4:
      return <Figure4Workspace figure={figure} />
    case 5:
      return <Figure5Workspace figure={figure} />
    default:
      return null
  }
}
