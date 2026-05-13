'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { Menu } from '@base-ui-components/react/menu'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsUpDown, MoreHorizontal, PanelLeft, Trash2, type LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

type SidebarProps = ComponentProps<'nav'> & {
  userName?: string
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({
  className,
  userName = 'User',
  collapsed,
  onToggle,
  children,
  ...props
}: SidebarProps) {
  return (
    <nav
      aria-label="Sidebar"
      data-collapsed={collapsed || undefined}
      className={cn(
        'group/sidebar border-border-subtle bg-page fixed left-0 top-0 z-30 flex h-dvh w-[var(--sidebar-width)] flex-col border-r-[0.5px] bg-gradient-to-t from-[rgba(245,244,237,0.05)] to-[rgba(245,244,237,0.3)] transition-[width] duration-200 data-[collapsed]:w-[var(--sidebar-width-collapsed)]',
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center justify-between p-2">
        <Link
          href="/new"
          className="text-text-primary flex h-8 items-center overflow-hidden whitespace-nowrap pl-2 font-serif text-lg font-medium no-underline group-data-[collapsed]/sidebar:hidden"
        >
          Dancing with Claude
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
            className="text-text-secondary hover:bg-state-hover flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>

      <div className="flex grow flex-col overflow-hidden">{children}</div>

      <div className="p-2">
        <div className="hover:bg-state-hover flex cursor-pointer items-center gap-3 rounded-md p-2 group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:p-0">
          <Avatar name={userName} />
          <div className="font-text text-text-primary grow truncate text-sm group-data-[collapsed]/sidebar:hidden">
            {userName}
          </div>
          <ChevronsUpDown className="text-text-tertiary size-4 group-data-[collapsed]/sidebar:hidden" />
        </div>
      </div>
    </nav>
  )
}

type SidebarNavProps = ComponentProps<'div'>

export function SidebarNav({ className, ...props }: SidebarNavProps) {
  return <div className={cn('flex flex-col gap-px px-2 pt-2', className)} {...props} />
}

type SidebarNavItemProps = {
  href: string
  icon: LucideIcon
  label: string
  className?: string
}

export function SidebarNavItem({ href, icon: Icon, label, className }: SidebarNavItemProps) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      title={label}
      data-active={active || undefined}
      className={cn(
        'text-text-secondary hover:bg-state-hover data-[active]:bg-state-active flex h-8 cursor-pointer items-center gap-3 rounded-sm px-2 text-sm no-underline group-data-[collapsed]/sidebar:w-8 group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:px-0',
        className,
      )}
    >
      <Icon className="text-text-primary size-4" />
      <span className="grow truncate leading-5 group-data-[collapsed]/sidebar:hidden">{label}</span>
    </Link>
  )
}

type SidebarSectionProps = ComponentProps<'div'> & {
  label: string
}

export function SidebarSection({ className, label, children, ...props }: SidebarSectionProps) {
  return (
    <div
      className={cn(
        'mt-5 flex grow flex-col overflow-auto px-2 group-data-[collapsed]/sidebar:hidden',
        className,
      )}
      {...props}
    >
      <div className="text-text-tertiary truncate px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.5px]">
        {label}
      </div>
      <ul className="m-0 flex list-none flex-col gap-px p-0">{children}</ul>
    </div>
  )
}

type SidebarChatItemProps = {
  href: string
  children: ReactNode
  onDelete?: () => void
  className?: string
}

export function SidebarChatItem({ href, children, onDelete, className }: SidebarChatItemProps) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <li className="group/item relative">
      <Link
        href={href}
        data-active={active || undefined}
        className={cn(
          'text-text-secondary hover:bg-state-hover-soft data-[active]:bg-state-active flex h-8 w-full items-center rounded-sm px-2 text-sm no-underline',
          onDelete && 'pr-9',
          className,
        )}
      >
        <span className="grow truncate leading-5">{children}</span>
      </Link>

      {onDelete && (
        <Menu.Root>
          <Menu.Trigger
            aria-label="Chat options"
            className="text-text-secondary hover:bg-state-hover absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/item:opacity-100 data-[popup-open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-50">
              <Menu.Popup className="bg-surface shadow-popover min-w-44 rounded-lg p-1 outline-none">
                <Menu.Item
                  onClick={onDelete}
                  className="text-danger data-[highlighted]:bg-state-hover flex cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 text-sm outline-none"
                >
                  <Trash2 className="size-4" />
                  <span>Delete</span>
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )}
    </li>
  )
}
