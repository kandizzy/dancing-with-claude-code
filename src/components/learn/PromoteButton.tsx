'use client'

import { useEffect, useState } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { ask } from '@/lib/ai/client'
import { cn } from '@/lib/utils'
import { FilePlus, Check, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui'

const POLISH_SYSTEM = `You are helping a designer write a note in their CLAUDE.md project-context file. The user has drafted some text. Refine it into a clean note suitable for the "## Notes" section.

Constraints:
- Short: 1–3 sentences total. Trim aggressively.
- Imperative voice: "Prefer X." "Always do Y." "Cite the score before recommending." Not "I would like" or "I think."
- Specific: keep concrete values, thresholds, conditions where the user mentioned them. Don't add invented numbers.
- Self-contained: no references to "the previous reply" or "as I said earlier."
- No bullet points unless multiple distinct rules are needed.

Return ONLY the refined note text. No preamble, no explanation, no quotes wrapping it, no leading "##".`

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
  const [polishing, setPolishing] = useState(false)
  const [polishError, setPolishError] = useState<string | null>(null)

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

  const onPolish = async () => {
    if (!draft.trim() || polishing) return
    setPolishing(true)
    setPolishError(null)
    try {
      const result = await ask({
        systemPrompt: POLISH_SYSTEM,
        userPrompt: draft.trim(),
      })
      // Strip leading/trailing quote marks Claude sometimes wraps with despite the instruction.
      const cleaned = result.text.trim().replace(/^["']+|["']+$/g, '')
      setDraft(cleaned)
    } catch (err) {
      setPolishError((err as Error)?.message ?? 'Polish request failed')
    } finally {
      setPolishing(false)
    }
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
              disabled={polishing}
              className="text-text-primary font-text border-border-subtle bg-page placeholder:text-text-tertiary min-h-[50vh] w-full resize-y rounded-md border p-3 text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)] disabled:opacity-60"
            />

            {polishError && (
              <p className="text-danger text-xs">Polish failed: {polishError}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onPolish}
                disabled={!draft.trim() || polishing}
                className="text-text-secondary hover:text-text-primary disabled:opacity-50 inline-flex items-center gap-1.5 text-xs"
                title="Ask Claude to rewrite this into a tighter, imperative-voice CLAUDE.md note"
              >
                {polishing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {polishing ? 'Polishing…' : 'Polish for CLAUDE.md'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-text-tertiary hover:text-text-primary px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  onClick={onSave}
                  disabled={!draft.trim() || polishing}
                >
                  <FilePlus className="size-4" />
                  Add to CLAUDE.md
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
