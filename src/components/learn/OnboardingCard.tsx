'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

type OnboardingCardProps = {
  storageKey: string
  children: React.ReactNode
  className?: string
}

// A one-time dismissible intro card. Dismissal is persisted in localStorage so the user only
// sees the framing on their first visit per browser.
export function OnboardingCard({ storageKey, children, className }: OnboardingCardProps) {
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === '1')
    setHydrated(true)
  }, [storageKey])

  if (!hydrated || dismissed) return null

  return (
    <div
      className={
        'border-border-subtle bg-[color:var(--color-accent)]/5 relative flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ' +
        (className ?? '')
      }
    >
      <div className="text-text-secondary flex-1 leading-snug">{children}</div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(storageKey, '1')
          setDismissed(true)
        }}
        aria-label="Dismiss"
        className="text-text-tertiary hover:text-text-primary shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
