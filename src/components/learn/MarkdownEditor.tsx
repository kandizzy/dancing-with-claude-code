'use client'

import { useMemo } from 'react'
import { marked } from 'marked'
import { cn } from '@/lib/utils'

/**
 * Markdown editor: textarea + live HTML preview. Layout is side-by-side by
 * default; pass `stacked` to render textarea above preview.
 *
 * Fully controlled — owner holds the markdown string and passes `value` +
 * `onChange`. Adapted from possible-futures/src/components/layout/markdown-editor.tsx
 * but restyled to fit the prototype's design tokens.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 16,
  placeholder,
  ariaLabel,
  stacked = false,
  className,
}: {
  value: string
  onChange: (next: string) => void
  rows?: number
  placeholder?: string
  ariaLabel?: string
  stacked?: boolean
  className?: string
}) {
  const html = useMemo(() => {
    try {
      return marked.parse(value || '', { async: false }) as string
    } catch {
      return ''
    }
  }, [value])

  return (
    <div
      className={cn(
        'grid gap-3',
        stacked ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2',
        className,
      )}
    >
      <div className="flex min-h-0 flex-col gap-1">
        <div className="text-text-tertiary font-mono text-[10px] uppercase tracking-[0.15em]">
          Markdown
        </div>
        <textarea
          aria-label={ariaLabel ?? 'Markdown editor'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          spellCheck
          className="text-text-primary border-border-subtle bg-page placeholder:text-text-tertiary w-full resize-y rounded-md border p-3 font-mono text-[12px] leading-[1.55] outline-none focus:border-[color:var(--color-accent-strong)]"
        />
      </div>
      <div className="flex min-h-0 flex-col gap-1">
        <div className="text-text-tertiary font-mono text-[10px] uppercase tracking-[0.15em]">
          Preview
        </div>
        <div
          className="md-preview text-text-primary border-border-subtle bg-surface min-h-[10rem] overflow-y-auto rounded-md border p-4 text-sm leading-relaxed"
          style={{ maxHeight: `calc(${rows * 1.55}em + 2.5rem)` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
