import { redirect } from 'next/navigation'

// The landing now lives at /. Anything pointing at /learn lands here and is forwarded.
export default function LegacyLearnLanding() {
  redirect('/')
}
