'use client'

import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { ChevronDown, FileText } from 'lucide-react'
import { MarkdownEditor } from './MarkdownEditor'
import { getNoteEntries } from '@/lib/levels/registry'
import type { ComponentProps } from 'react'

type ClaudeMdDrawerProps = ComponentProps<'div'>

/**
 * Collapsible CLAUDE.md surface rendered on every page. A thin bar by default;
 * expanding it overlays a MarkdownEditor below without reflowing the page.
 *
 * Open/closed state lives in the LearnProvider so it persists across navigations
 * (and survives a refresh via localStorage).
 */
export function ClaudeMdDrawer({ className, ...props }: ClaudeMdDrawerProps) {
  const { claudeMd, setClaudeMd, claudeMdOpen, setClaudeMdOpen } = useLearnStore()
  const noteCount = getNoteEntries(claudeMd).length

  return (
    <div className={cn('relative z-30', className)} {...props}>
      <button
        type="button"
        onClick={() => setClaudeMdOpen(!claudeMdOpen)}
        aria-expanded={claudeMdOpen}
        className="border-border-subtle bg-surface hover:bg-state-hover flex w-full items-center gap-3 rounded-lg border px-4 py-2 text-xs"
      >
        <FileText className="text-text-secondary size-3.5" />
        <span className="text-text-secondary font-mono">CLAUDE.md</span>
        <span className="text-text-tertiary">·</span>
        <span className="text-text-tertiary">
          {noteCount} note{noteCount === 1 ? '' : 's'}
        </span>
        <span className="text-text-tertiary ml-auto hidden italic sm:inline">
          Claude reads this on every reply.
        </span>
        <ChevronDown
          className={cn(
            'text-text-tertiary size-4 transition-transform',
            claudeMdOpen && 'rotate-180',
          )}
        />
      </button>

      {claudeMdOpen && (
        <div className="border-border-subtle bg-surface shadow-popover absolute inset-x-0 top-full z-30 mt-1 max-h-[80vh] overflow-y-auto rounded-lg border p-4">
          <MarkdownEditor
            value={claudeMd}
            onChange={setClaudeMd}
            ariaLabel="CLAUDE.md markdown editor"
          />
        </div>
      )}
    </div>
  )
}
