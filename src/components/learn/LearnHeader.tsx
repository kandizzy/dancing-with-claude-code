import Link from 'next/link'
import { ShapeTray } from './ShapeTray'

export function LearnHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="text-text-primary font-serif text-xl">
        Dancing with Claude
      </Link>
      <ShapeTray />
    </header>
  )
}
