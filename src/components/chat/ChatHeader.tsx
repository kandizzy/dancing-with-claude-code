import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

type ChatHeaderProps = ComponentProps<'header'> & {
  title: string
  onShare?: () => void
}

export function ChatHeader({ className, title, onShare, ...props }: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'bg-page sticky top-0 z-20 flex h-[var(--header-height)] items-center justify-between px-4',
        className,
      )}
      {...props}
    >
      <Button variant="ghost" className="text-text-primary gap-1 px-2 font-semibold">
        <span className="max-w-[300px] truncate">{title}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </Button>

      <Button variant="outline" onClick={onShare}>
        Share
      </Button>
    </header>
  )
}
