'use client'

import { cn } from '@/lib/utils'
import { useState, type ComponentProps } from 'react'
import { ChevronDown, FileText } from 'lucide-react'

type ClaudeMdCardProps = ComponentProps<'div'> & {
  filename?: string
  content: string
  caption?: string
}

export function ClaudeMdCard({
  filename = 'CLAUDE.md',
  content,
  caption,
  className,
  ...props
}: ClaudeMdCardProps) {
  const [open, setOpen] = useState(true)

  return (
    <div
      className={cn(
        'border-border-subtle bg-surface flex flex-col rounded-lg border',
        className,
      )}
      {...props}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border-soft text-text-secondary hover:bg-state-hover flex items-center gap-2 border-b px-4 py-2.5 text-left text-sm"
      >
        <FileText className="size-4" />
        <span className="font-mono text-xs">{filename}</span>
        {caption && <span className="text-text-tertiary ml-2 text-xs italic">{caption}</span>}
        <ChevronDown
          className={cn('ml-auto size-4 transition-transform', open ? '' : '-rotate-90')}
        />
      </button>
      {open && (
        <pre className="scroll-area font-mono text-text-secondary max-h-[60vh] overflow-y-auto whitespace-pre-wrap p-4 text-xs leading-relaxed">
          {content}
        </pre>
      )}
    </div>
  )
}
