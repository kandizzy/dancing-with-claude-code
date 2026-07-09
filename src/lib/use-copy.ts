'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyStatus = 'idle' | 'copied' | 'failed'

const RESET_MS = 2000

// Clipboard write with visible success/failure state. Clipboard access can be
// denied (permissions policy, insecure context), so 'failed' is a real state
// the UI must show — never swallow it.
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const copy = useCallback(async (text: string) => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    timerRef.current = window.setTimeout(() => setStatus('idle'), RESET_MS)
  }, [])

  return { status, copy }
}
