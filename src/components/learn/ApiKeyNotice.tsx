'use client'

/**
 * Pre-flight authentication notice for the chat surfaces.
 *
 * Every configuration consumes tokens — there's no free path. The notice
 * makes the billing channel visible so students aren't surprised when
 * their personal Claude Code subscription gets charged for prototype
 * exploration.
 *
 * Three states:
 *   1. ANTHROPIC_API_KEY set → silent (explicit, billed to that key)
 *   2. No key, CLI present → soft heads-up about subscription billing
 *   3. Neither → red warning, chat will error
 */

import { Info, AlertCircle } from 'lucide-react'
import type { AuthStatus } from '@/lib/ai/client'

type Props = { status: AuthStatus | null }

export function ApiKeyNotice({ status }: Props) {
  if (!status) return null
  if (status.hasApiKey) return null

  if (status.hasCli) {
    return (
      <div className="border-border-subtle bg-page mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
        <Info className="text-text-tertiary size-3.5 shrink-0" />
        <span className="text-text-secondary">
          No <code className="font-mono">ANTHROPIC_API_KEY</code> — using your{' '}
          <code className="font-mono">claude</code> CLI login. Tokens count against
          that account.
        </span>
      </div>
    )
  }

  return (
    <div className="border-border-subtle text-danger mb-3 flex items-start gap-2 rounded-md border p-3 text-xs">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <div className="flex-1">
        <p className="m-0 font-medium">Claude isn&apos;t configured.</p>
        <p className="text-text-tertiary m-0 mt-1 leading-relaxed">
          Set <code className="font-mono">ANTHROPIC_API_KEY</code> in{' '}
          <code className="font-mono">.env.local</code>, or install and log into the{' '}
          <code className="font-mono">claude</code> CLI. Either path uses tokens.
        </p>
      </div>
    </div>
  )
}
