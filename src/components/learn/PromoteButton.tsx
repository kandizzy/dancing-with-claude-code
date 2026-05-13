'use client'

import { useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { FilePlus, Check } from 'lucide-react'

type PromoteButtonProps = {
  sourceText: string
  className?: string
}

// Small affordance next to a Claude reply. Click to draft an entry pre-filled from the reply,
// edit it, and add to CLAUDE.md. The edit step is the user's authorship moment.
export function PromoteButton({ sourceText, className }: PromoteButtonProps) {
  const { promoteEntry } = useLearnStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [justAdded, setJustAdded] = useState(false)

  if (justAdded) {
    return (
      <div className={cn('text-text-tertiary flex items-center gap-1 text-xs', className)}>
        <Check className="size-3" />
        Added to CLAUDE.md
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          // Prefill with the reply but trimmed to a manageable length — encourages the user to refine.
          const trimmed = sourceText.trim()
          const seed = trimmed.length > 240 ? trimmed.slice(0, 237) + '…' : trimmed
          setDraft(seed)
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
    )
  }

  return (
    <div className="border-border-subtle bg-page mt-2 flex flex-col gap-2 rounded-md border p-2">
      <p className="text-text-tertiary m-0 text-xs">
        Edit this down to the part you want Claude to remember next time:
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        autoFocus
        className="text-text-primary font-text resize-y border-none bg-transparent p-0 font-sans text-sm leading-snug outline-none"
      />
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            if (draft.trim()) {
              promoteEntry(draft, 'claude')
              setJustAdded(true)
              setOpen(false)
              setTimeout(() => setJustAdded(false), 2500)
            }
          }}
          className="text-text-primary border-border-subtle hover:bg-state-hover rounded border px-2 py-0.5"
        >
          Add to CLAUDE.md
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-text-tertiary hover:text-text-primary px-2 py-0.5"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
