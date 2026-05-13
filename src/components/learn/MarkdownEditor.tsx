'use client'

import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

type View = 'preview' | 'markdown'

/**
 * Markdown editor. Layout:
 *
 * - Desktop (md+): preview on top, raw markdown editor below — stacked.
 * - Mobile: tabbed view, preview shown by default. Toggle to flip to raw.
 *
 * Adapted from possible-futures/src/components/layout/markdown-editor.tsx and restyled
 * to the prototype's design tokens. Fully controlled — owner holds `value` + `onChange`.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 16,
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
      {/* Mobile-only toggle. Hidden on md+ where both panels are visible. */}
      <div className="md:hidden border-border-subtle inline-flex w-fit rounded-md border p-0.5 text-xs">
        <TabButton active={view === 'preview'} onClick={() => setView('preview')}>
          Preview
        </TabButton>
        <TabButton active={view === 'markdown'} onClick={() => setView('markdown')}>
          Markdown
        </TabButton>
      </div>

      {/* Preview — on top in stacked desktop view; first tab on mobile. */}
      <Section
        label="Preview"
        className={cn(view !== 'preview' && 'hidden md:flex')}
      >
        <div
          className="md-preview text-text-primary border-border-subtle bg-surface min-h-[6rem] overflow-y-auto rounded-md border p-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Section>

      {/* Raw markdown — below preview on desktop; second tab on mobile. */}
      <Section
        label="Markdown"
        className={cn(view !== 'markdown' && 'hidden md:flex')}
      >
        <textarea
          aria-label={ariaLabel ?? 'Markdown editor'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          spellCheck
          className="text-text-primary border-border-subtle bg-page placeholder:text-text-tertiary w-full resize-y rounded-md border p-3 font-mono text-[12px] leading-[1.55] outline-none focus:border-[color:var(--color-accent-strong)]"
        />
      </Section>
    </div>
  )
}

function Section({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-0 flex-col gap-1', className)}>
      <div className="text-text-tertiary hidden font-mono text-[10px] uppercase tracking-[0.15em] md:block">
        {label}
      </div>
      {children}
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
