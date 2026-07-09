'use client'

import { Check, Copy, X } from 'lucide-react'
import { useCopy } from '@/lib/use-copy'

// Copy-to-clipboard command row, shared by Figure 5 and the send-off.
export function CommandLine({ command }: { command: string }) {
  const { status, copy } = useCopy()
  return (
    <div className="bg-page flex items-start gap-2 rounded font-mono text-xs leading-relaxed">
      <span className="text-text-tertiary select-none">$</span>
      <code className="text-text-primary flex-1 whitespace-pre-wrap break-all">{command}</code>
      {status === 'failed' && (
        <span className="text-danger shrink-0 text-[10px]">Copy failed</span>
      )}
      <button
        type="button"
        onClick={() => copy(command)}
        aria-label="Copy command"
        className="text-text-tertiary hover:text-text-primary shrink-0"
      >
        {status === 'copied' ? (
          <Check className="size-3.5" />
        ) : status === 'failed' ? (
          <X className="text-danger size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  )
}
