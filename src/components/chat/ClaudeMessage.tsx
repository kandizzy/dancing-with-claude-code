import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

type ClaudeMessageProps = ComponentProps<'div'>

export function ClaudeMessage({ className, children, ...props }: ClaudeMessageProps) {
  return (
    <div
      className={cn(
        'font-text grid gap-2 px-4 py-3 font-sans text-base leading-snug',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type ClaudeHeadingProps = ComponentProps<'h2'> & {
  level?: 2 | 3
}

export function ClaudeHeading({ className, level = 2, ...props }: ClaudeHeadingProps) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag
      className={cn(
        'text-text-primary -mb-0.5 mt-2 font-semibold',
        level === 2 ? 'text-lg' : 'text-base',
        className,
      )}
      {...props}
    />
  )
}

type ClaudeParagraphProps = ComponentProps<'p'>

export function ClaudeParagraph({ className, ...props }: ClaudeParagraphProps) {
  return <p className={cn('m-0', className)} {...props} />
}

type ClaudeListProps = ComponentProps<'ul'>

export function ClaudeList({ className, ...props }: ClaudeListProps) {
  return <ul className={cn('m-0 list-disc pl-5', className)} {...props} />
}

type ClaudeListItemProps = ComponentProps<'li'>

export function ClaudeListItem({ className, ...props }: ClaudeListItemProps) {
  return <li className={cn('mb-2', className)} {...props} />
}

type ClaudeCitationProps = ComponentProps<'span'> & {
  source: string
}

export function ClaudeCitation({ className, source, ...props }: ClaudeCitationProps) {
  return (
    <span
      className={cn(
        'rounded-xs bg-state-pill font-text text-text-tertiary ml-1 inline-flex items-center px-1.5 py-0.5 align-middle font-sans text-xs',
        className,
      )}
      {...props}
    >
      {source}
    </span>
  )
}
