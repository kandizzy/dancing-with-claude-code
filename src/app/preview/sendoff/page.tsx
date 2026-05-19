/**
 * Standalone preview of the figure-5 send-off screen.
 *
 * Lets us iterate on the dancer + closing copy without walking through five
 * figures' worth of state. Renders `<Sendoff />` with sensible defaults:
 *   - decision: 'merged' (the more common path)
 *   - branchName: a generic-looking placeholder
 *   - onDismiss: a no-op (nothing to dismiss to from a preview route)
 *   - justDecided: true (previews the richer figure-5-specific copy)
 *
 * Visit at /preview/sendoff. Not linked from anywhere in the prototype — it's
 * a developer convenience, not a user-facing route.
 *
 * Marked 'use client' because we pass an `onDismiss` function down to the
 * Sendoff component, which is a Client Component. Function props can't
 * cross the server/client boundary.
 */

'use client'

import { Sendoff } from '@/components/learn/Sendoff'

export default function SendoffPreviewPage() {
  return (
    <Sendoff
      decision="merged"
      branchName="feature/your-next-thing"
      onDismiss={() => {}}
      justDecided={true}
    />
  )
}
