import Link from 'next/link'
import { ShapeTray } from './ShapeTray'

export function LearnHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link href="/learn" className="text-text-primary font-serif text-xl">
        Five shapes
      </Link>
      <ShapeTray />
    </header>
  )
}
