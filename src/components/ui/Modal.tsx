'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onClose: () => void
  /** Visible title; also the dialog's accessible name. Omit (and pass ariaLabel) for no header. */
  title?: string
  /** Accessible name when there's no visible title. */
  ariaLabel?: string
  /** Appended to the card so each modal can tune width/height (e.g. 'max-w-2xl max-h-[90vh]'). */
  className?: string
  children: ReactNode
}

/**
 * The app's modal shell: a centered card over a dimmed backdrop. Dismisses on Escape, a click
 * on the backdrop, or the header's ✕, and locks body scroll while open. Callers supply the body
 * and footer as children; pass `title` to get the standard header + close button.
 *
 * Extracted from three identical hand-rolled overlays (PromoteButton, Figure5Workspace's
 * edit-directive dialog, ResetProgressButton) so the idiom lives in one place — and so the two
 * that were missing Escape / scroll-lock now get them for free.
 */
export function Modal({ open, onClose, title, ariaLabel, className, children }: ModalProps) {
  // Ref so the Escape handler always sees the latest onClose without the effect re-subscribing
  // every render (callers usually pass an inline arrow).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? ariaLabel}
    >
      <div
        className={cn(
          'bg-surface border-border-subtle shadow-popover relative flex w-full max-w-md flex-col gap-3 rounded-lg border p-5',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="flex items-baseline justify-between gap-2">
            <h2 className="text-text-primary m-0 font-serif text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-text-tertiary hover:text-text-primary self-center"
            >
              <X className="size-4" />
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  )
}
