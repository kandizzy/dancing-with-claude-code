'use client'

import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

type View = 'preview' | 'edit'

/**
 * Markdown editor with two modes via a pill toggle:
 *
 * - Preview — rendered HTML. Default view.
 * - Edit — editable textarea.
 *
 * Fully controlled — owner holds `value` + `onChange`. Adapted from
 * possible-futures/src/components/layout/markdown-editor.tsx and restyled to the prototype's
 * design tokens.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 28,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string
  onChange: (next: string) => void
  rows?: number
  placeholder?: string
  ariaLabel?: string
  className?: string
}) {
  const [view, setView] = useState<View>('preview')

  const html = useMemo(() => {
    try {
      return marked.parse(value || '', { async: false }) as string
    } catch {
      return ''
    }
  }, [value])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="border-border-subtle inline-flex w-fit rounded-md border p-0.5 text-xs">
        <TabButton active={view === 'preview'} onClick={() => setView('preview')}>
          Preview
        </TabButton>
        <TabButton active={view === 'edit'} onClick={() => setView('edit')}>
          Edit
        </TabButton>
      </div>

      {view === 'preview' && (
        <div
          className="md-preview text-text-primary border-border-subtle bg-surface min-h-[8rem] overflow-y-auto rounded-md border p-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {view === 'edit' && (
        <textarea
          aria-label={ariaLabel ?? 'Markdown editor'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          spellCheck
          autoFocus
          className="text-text-primary border-border-subtle bg-page placeholder:text-text-tertiary min-h-[60vh] w-full resize-y rounded-md border p-3 font-mono text-[12px] leading-[1.55] outline-none focus:border-[color:var(--color-accent-strong)]"
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded px-3 py-1 transition-colors',
        active
          ? 'bg-[color:var(--color-accent)]/10 text-text-primary'
          : 'text-text-tertiary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}
