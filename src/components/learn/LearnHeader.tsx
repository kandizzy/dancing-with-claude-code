import Link from 'next/link'
import { ShapeTray } from './ShapeTray'

export function LearnHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="text-text-primary font-serif text-2xl leading-none tracking-tight"
      >
        Dancing with Claude
      </Link>
      <ShapeTray />
    </header>
  )
}
