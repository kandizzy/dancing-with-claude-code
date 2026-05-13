'use client'

import { useEffect, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { FilePlus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui'

type PromoteButtonProps = {
  sourceText: string
  className?: string
}

// Click "Add to CLAUDE.md" → modal overlay with a generous textarea so the user can read and
// trim the candidate text comfortably before saving. The edit step is the user's authorship
// moment; an inline 3-row textarea wasn't doing it justice for long Claude replies.
export function PromoteButton({ sourceText, className }: PromoteButtonProps) {
  const { appendNote, setClaudeMdOpen } = useLearnStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (justAdded) {
    return (
      <div className={cn('text-text-tertiary flex items-center gap-1 text-xs', className)}>
        <Check className="size-3" />
        Added to CLAUDE.md
      </div>
    )
  }

  const onSave = () => {
    if (!draft.trim()) return
    appendNote(draft)
    setClaudeMdOpen(true)
    setOpen(false)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 2500)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(sourceText.trim())
          setOpen(true)
        }}
        className={cn(
          'text-text-tertiary hover:text-text-primary flex items-center gap-1 text-xs',
          className,
        )}
      >
        <FilePlus className="size-3" />
        Add to CLAUDE.md
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add to CLAUDE.md"
        >
          <div
            className="bg-surface border-border-subtle shadow-popover relative flex max-h-[90vh] w-full max-w-2xl flex-col gap-3 rounded-lg border p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-baseline justify-between gap-2">
              <h2 className="text-text-primary font-serif text-lg">Add to CLAUDE.md</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            </header>

            <p className="text-text-secondary m-0 text-xs leading-relaxed">
              Edit this down to the part you want Claude to remember. The shorter and more
              specific the note, the more likely it shows up in the next reply. Saving appends
              it under <code className="font-mono text-[11px]">## Notes</code>.
            </p>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="text-text-primary font-text border-border-subtle bg-page placeholder:text-text-tertiary min-h-[50vh] w-full resize-y rounded-md border p-3 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-tertiary hover:text-text-primary px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <Button variant="primary" onClick={onSave} disabled={!draft.trim()}>
                <FilePlus className="size-4" />
                Add to CLAUDE.md
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
