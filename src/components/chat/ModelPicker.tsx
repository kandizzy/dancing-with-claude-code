'use client'

import { Menu } from '@base-ui-components/react/menu'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { Model } from '@/lib/api'

type ModelPickerProps = {
  models: Model[]
  value: Model
  onChange: (model: Model) => void
  className?: string
}

export function ModelPicker({ models, value, onChange, className }: ModelPickerProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          'font-text text-text-secondary hover:bg-state-hover inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-sm bg-transparent pl-2.5 pr-2 font-sans text-sm transition-colors',
          className,
        )}
      >
        <span className="select-none">{value.label}</span>
        <ChevronsUpDown className="size-4 opacity-75" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="bg-surface shadow-popover min-w-48 rounded-lg p-1 outline-none">
            {models.map((m) => (
              <Menu.Item
                key={m.id}
                onClick={() => onChange(m)}
                className="text-text-secondary data-[highlighted]:bg-state-hover flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-2 text-sm outline-none"
              >
                <span>{m.label}</span>
                {m.id === value.id && <Check className="size-3.5" />}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
