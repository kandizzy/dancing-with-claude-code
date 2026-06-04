'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLearnStore } from '@/lib/learn-store'
import { cn } from '@/lib/utils'
import { ChevronDown, FileText, RefreshCw } from 'lucide-react'
import { MarkdownEditor } from './MarkdownEditor'
import { ClaudeMdInfo } from './ClaudeMdInfo'
import { getNoteEntries } from '@/lib/figures/registry'
import type { ComponentProps } from 'react'

type ClaudeMdDrawerProps = ComponentProps<'div'>

/**
 * Collapsible CLAUDE.md surface rendered on every page. A thin bar by default;
 * expanding it overlays a MarkdownEditor below without reflowing the page.
 *
 * Open/closed state lives in the LearnProvider so the in-page toggle is reactive.
 * The drawer auto-closes on route changes so opening it on figure 1 (e.g. via a
 * starter-note click) doesn't leave it open when the user navigates to figure 2.
 */
export function ClaudeMdDrawer({ className, ...props }: ClaudeMdDrawerProps) {
  const { claudeMd, setClaudeMd, claudeMdOpen, setClaudeMdOpen, isDirty, graceUsed, reloadContext } =
    useLearnStore()
  const noteCount = getNoteEntries(claudeMd).length
  const pathname = usePathname()
  // After the first-edit grace (always spent by the time figures 2–5 are reachable), a draft
  // edit that hasn't been pinned shows a quiet reload chip — the calm, repeated reinforcement
  // of figure 1's loud lesson, without re-teaching it.
  const showReloadChip = isDirty && graceUsed

  // Close the drawer on EVERY mount and every path change. The previous version
  // guarded on `lastPathRef.current !== null` to skip the initial mount, but figure 1
  // doesn't render this drawer at all (it uses ClaudeMdAuthor inline). When the user
  // opens the drawer state from figure 1 (via a starter-note click that calls
  // setClaudeMdOpen(true)) and then navigates to figure 2, this is the drawer's first
  // mount on that path — the ref-based change detector skipped, and the drawer
  // rendered as open. Removing the guard means the drawer always starts closed when
  // it mounts, which is the behavior the user expects.
  useEffect(() => {
    setClaudeMdOpen(false)
  }, [pathname, setClaudeMdOpen])

  return (
    <div className={cn('relative z-30', className)} {...props}>
      <div className="border-border-subtle bg-surface flex w-full items-center gap-3 rounded-lg border px-4 py-2 text-xs">
        <button
          type="button"
          onClick={() => setClaudeMdOpen(!claudeMdOpen)}
          aria-expanded={claudeMdOpen}
          aria-label={claudeMdOpen ? 'Collapse CLAUDE.md' : 'Expand CLAUDE.md'}
          className="hover:text-text-primary flex flex-1 items-center gap-3 text-left"
        >
          <FileText className="text-text-secondary size-3.5" />
          <span className="text-text-secondary font-mono">CLAUDE.md</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-text-tertiary">
            {noteCount} note{noteCount === 1 ? '' : 's'} so far
          </span>
          <ChevronDown
            className={cn(
              'text-text-tertiary ml-auto size-4 transition-transform',
              claudeMdOpen && 'rotate-180',
            )}
          />
        </button>
        {/* Quiet "your edits aren't applied yet" reinforcement. A sibling of the toggle (not
            nested), so clicking it pins the draft without expanding/collapsing the drawer. */}
        {showReloadChip && (
          <button
            type="button"
            onClick={reloadContext}
            title="Your CLAUDE.md edits aren't in Claude's context yet — reload to apply them"
            className="border-[color:var(--color-accent-strong)]/30 bg-[color:var(--color-accent)]/5 text-[color:var(--color-accent-strong)] hover:bg-[color:var(--color-accent)]/10 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-medium"
          >
            <RefreshCw className="size-3" />
            Reload to apply
          </button>
        )}
        {/* Sibling of the toggle, not nested — avoids button-in-button and keeps opening the
            "how it loads" popover from expanding/collapsing the drawer. */}
        <ClaudeMdInfo className="shrink-0" />
      </div>

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
