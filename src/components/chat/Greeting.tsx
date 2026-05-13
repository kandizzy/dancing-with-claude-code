import { cn } from '@/lib/utils'
import type { ComponentProps, CSSProperties } from 'react'

type GreetingProps = ComponentProps<'div'> & {
  name?: string
  timeOfDay?: string
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

export function Greeting({ className, style, name = 'there', timeOfDay, ...props }: GreetingProps) {
  return (
    <div
      className={cn(
        'text-text-secondary inline-flex select-none items-center justify-center gap-3 font-serif text-[40px] font-light leading-[60px]',
        className,
      )}
      style={{ fontVariationSettings: '"opsz" 48', ...style } as CSSProperties}
      {...props}
    >
      <img src="/assets/ClaudeSpark.svg" alt="" className="h-8 w-8" />
      <span suppressHydrationWarning>
        {timeOfDay ?? getTimeOfDay()}, {name}
      </span>
    </div>
  )
}
