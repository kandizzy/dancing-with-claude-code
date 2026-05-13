'use client'

import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'
import { MarkdownEditor } from './MarkdownEditor'
import type { ComponentProps } from 'react'

type ClaudeMdAuthorProps = ComponentProps<'div'> & {
  /** Render textarea + preview stacked vertically instead of side-by-side. */
  stacked?: boolean
  /** Rows to size the editor textarea (and preview max-height). */
  rows?: number
}

export function ClaudeMdAuthor({
  className,
  stacked = false,
  rows = 18,
  ...props
}: ClaudeMdAuthorProps) {
  const { claudeMd, setClaudeMd } = useLearnStore()

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

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-4">
        <MarkdownEditor
          value={claudeMd}
          onChange={setClaudeMd}
          rows={rows}
          stacked={stacked}
          ariaLabel="CLAUDE.md markdown editor"
        />
      </div>
    </div>
  )
}
