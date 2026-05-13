import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

type UserMessageProps = ComponentProps<'div'> & {
  text?: string
}

export function UserMessage({ className, text, children, ...props }: UserMessageProps) {
  return (
    <div className={cn('mb-2 mt-8 flex justify-end', className)} {...props}>
      <div className="bg-user-bubble font-text text-text-primary max-w-[85%] break-words rounded-lg px-4 py-2.5 font-sans text-base leading-snug">
        {children ?? <p className="m-0 whitespace-pre-wrap">{text}</p>}
      </div>
    </div>
  )
}
