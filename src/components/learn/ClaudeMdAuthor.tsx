'use client'

import { useState, type ComponentProps } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { ChevronDown, FileText, Plus, Trash2, User, Sparkles } from 'lucide-react'

type ClaudeMdAuthorProps = ComponentProps<'div'> & {
  highlightEntryId?: string | null
}

export function ClaudeMdAuthor({ className, highlightEntryId, ...props }: ClaudeMdAuthorProps) {
  const {
    claudeMd,
    addBehaviorRule,
    removeBehaviorRule,
    editBehaviorRule,
    promoteEntry,
    removeEntry,
    editEntry,
  } = useLearnStore()

  const [stackOpen, setStackOpen] = useState(true)
  const [behaviorOpen, setBehaviorOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)

  return (
    <div
      className={cn(
        'border-border-subtle bg-surface flex min-h-0 flex-col rounded-lg border',
        className,
      )}
      {...props}
    >
      <div className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-4 py-2.5 text-sm">
        <FileText className="size-4" />
        <span className="font-mono text-xs">CLAUDE.md</span>
        <span className="text-text-tertiary ml-2 text-xs italic">
          live — every ask reads this
        </span>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
        <Section
          label="Project (read-only)"
          open={stackOpen}
          onToggle={() => setStackOpen((o) => !o)}
        >
          <pre className="text-text-secondary whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {claudeMd.stack}
          </pre>
        </Section>

        <Section
          label="How Claude should behave"
          open={behaviorOpen}
          onToggle={() => setBehaviorOpen((o) => !o)}
        >
          <ul className="flex flex-col gap-2">
            {claudeMd.behavior.map((rule, i) => (
              <EditableRow
                key={i}
                value={rule}
                onSave={(v) => editBehaviorRule(i, v)}
                onDelete={() => removeBehaviorRule(i)}
              />
            ))}
          </ul>
          <AddRow placeholder="Add a behavior rule…" onAdd={addBehaviorRule} />
        </Section>

        <Section
          label={`Your pinned notes${claudeMd.userEntries.length ? ` · ${claudeMd.userEntries.length}` : ''}`}
          open={notesOpen}
          onToggle={() => setNotesOpen((o) => !o)}
        >
          {claudeMd.userEntries.length === 0 && (
            <p className="text-text-tertiary m-0 text-xs italic">
              Empty. Pin a Claude reply or write your own note below — anything you want Claude
              to treat as authoritative on the next ask.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {claudeMd.userEntries.map((entry) => (
              <EditableRow
                key={entry.id}
                value={entry.text}
                source={entry.source}
                highlighted={entry.id === highlightEntryId}
                onSave={(v) => editEntry(entry.id, v)}
                onDelete={() => removeEntry(entry.id)}
              />
            ))}
          </ul>
          <AddRow
            placeholder="Pin your own note…"
            onAdd={(text) => {
              promoteEntry(text, 'user')
            }}
          />
        </Section>
      </div>
    </div>
  )
}

function Section({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="border-border-soft border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="text-text-secondary hover:bg-state-hover flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
      >
        <ChevronDown
          className={cn('size-3 transition-transform', open ? '' : '-rotate-90')}
        />
        {label}
      </button>
      {open && <div className="flex flex-col gap-3 px-4 pb-4 pt-1">{children}</div>}
    </section>
  )
}

function EditableRow({
  value,
  onSave,
  onDelete,
  source,
  highlighted,
}: {
  value: string
  onSave: (next: string) => void
  onDelete: () => void
  source?: 'user' | 'claude'
  highlighted?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    return (
      <li className="border-border-subtle bg-page flex flex-col gap-2 rounded-md border p-2">
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
                onSave(draft)
                setEditing(false)
              }
            }}
            className="text-text-primary border-border-subtle hover:bg-state-hover rounded border px-2 py-0.5"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value)
              setEditing(false)
            }}
            className="text-text-tertiary hover:text-text-primary px-2 py-0.5"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={cn(
        'border-border-subtle group flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        highlighted
          ? 'border-[color:var(--color-accent-strong)] bg-[color:var(--color-accent)]/10'
          : 'bg-page',
      )}
    >
      {source && (
        <span
          className="text-text-tertiary mt-0.5"
          title={source === 'claude' ? 'pinned from a Claude reply' : 'your own note'}
        >
          {source === 'claude' ? (
            <Sparkles className="size-3" />
          ) : (
            <User className="size-3" />
          )}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className="text-text-primary m-0 flex-1 cursor-text text-left leading-snug"
      >
        {value}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove"
        className="text-text-tertiary hover:text-danger opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  )
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-text-tertiary hover:text-text-primary flex items-center gap-1 text-xs"
      >
        <Plus className="size-3" />
        {placeholder}
      </button>
    )
  }

  return (
    <div className="border-border-subtle bg-page flex flex-col gap-2 rounded-md border p-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus
        className="text-text-primary font-text placeholder:text-text-tertiary resize-y border-none bg-transparent p-0 font-sans text-sm leading-snug outline-none"
      />
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            if (draft.trim()) {
              onAdd(draft)
              setDraft('')
              setOpen(false)
            }
          }}
          className="text-text-primary border-border-subtle hover:bg-state-hover rounded border px-2 py-0.5"
        >
          Pin
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft('')
            setOpen(false)
          }}
          className="text-text-tertiary hover:text-text-primary px-2 py-0.5"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
