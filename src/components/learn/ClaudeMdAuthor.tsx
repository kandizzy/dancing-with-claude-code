'use client'

import { useState, type ComponentProps } from 'react'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { FileText, Plus, Trash2, User, Sparkles } from 'lucide-react'

type ClaudeMdAuthorProps = ComponentProps<'div'> & {
  highlightEntryId?: string | null
}

// Single-document editor for the live CLAUDE.md.
// Looks like a real markdown file the user can imagine being on disk.
export function ClaudeMdAuthor({ className, highlightEntryId, ...props }: ClaudeMdAuthorProps) {
  const {
    claudeMd,
    setStack,
    addBehaviorRule,
    removeBehaviorRule,
    editBehaviorRule,
    promoteEntry,
    removeEntry,
    editEntry,
  } = useLearnStore()

  return (
    <div
      className={cn(
        'border-border-subtle bg-surface flex min-h-0 flex-col rounded-lg border',
        className,
      )}
      {...props}
    >
      <div className="border-border-soft text-text-secondary flex items-center gap-2 border-b px-4 py-2 text-xs">
        <FileText className="size-3.5" />
        <span className="font-mono">CLAUDE.md</span>
        <span className="text-text-tertiary ml-auto italic">
          Claude reads this on every reply.
        </span>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <Heading>About this project</Heading>
        <ProseBlock value={claudeMd.stack} onSave={setStack} />

        <Heading>How Claude should behave</Heading>
        <ul className="m-0 list-none space-y-1 p-0">
          {claudeMd.behavior.map((rule, i) => (
            <BulletRow
              key={i}
              value={rule}
              onSave={(v) => editBehaviorRule(i, v)}
              onDelete={() => removeBehaviorRule(i)}
            />
          ))}
        </ul>
        <AddRow placeholder="Add a rule…" onAdd={addBehaviorRule} />

        <Heading>Notes</Heading>
        {claudeMd.userEntries.length === 0 && (
          <p className="text-text-tertiary mt-0 text-xs italic">
            Empty. Add a Claude reply you want to remember, or write your own note below.
          </p>
        )}
        <ul className="m-0 list-none space-y-1 p-0">
          {claudeMd.userEntries.map((entry) => (
            <BulletRow
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
          placeholder="Write a note…"
          onAdd={(text) => {
            promoteEntry(text, 'user')
          }}
        />
      </div>
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-text-primary mb-2 mt-5 font-serif text-base first:mt-0">
      <span className="text-text-tertiary mr-2 font-mono text-sm">##</span>
      {children}
    </h3>
  )
}

function ProseBlock({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          autoFocus
          className="text-text-primary font-text border-border-subtle bg-page resize-y rounded-md border p-2 font-sans text-sm leading-snug outline-none focus:border-[color:var(--color-accent-strong)]"
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
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className="text-text-secondary hover:bg-state-hover-soft -mx-2 block w-full whitespace-pre-wrap rounded-md px-2 py-1 text-left text-sm leading-relaxed"
    >
      {value}
    </button>
  )
}

function BulletRow({
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
      <li className="border-border-subtle bg-page my-1 flex flex-col gap-2 rounded-md border p-2">
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
        'group -mx-2 flex items-start gap-2 rounded-md px-2 py-1 text-sm leading-relaxed',
        highlighted
          ? 'bg-[color:var(--color-accent)]/10 ring-1 ring-[color:var(--color-accent-strong)]'
          : 'hover:bg-state-hover-soft',
      )}
    >
      <span className="text-text-tertiary mt-1 select-none">·</span>
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className="text-text-primary m-0 flex-1 cursor-text text-left leading-relaxed"
      >
        {value}
      </button>
      {source && (
        <span
          className="text-text-tertiary mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          title={source === 'claude' ? 'added from a Claude reply' : 'your own note'}
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
        onClick={onDelete}
        aria-label="Remove"
        className="text-text-tertiary hover:text-danger mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
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
        className="text-text-tertiary hover:text-text-primary mt-1 flex items-center gap-1 text-xs"
      >
        <Plus className="size-3" />
        {placeholder}
      </button>
    )
  }

  return (
    <div className="border-border-subtle bg-page mt-1 flex flex-col gap-2 rounded-md border p-2">
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
          Add
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
