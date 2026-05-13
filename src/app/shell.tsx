'use client'

import {
  Sidebar,
  SidebarChatItem,
  SidebarNav,
  SidebarNavItem,
  SidebarSection,
} from '@/components/chat'
import { useChatStore } from '@/lib/chat-store'
import { cn } from '@/lib/utils'
import { Folder, Plus } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

const COLLAPSED_KEY = 'education-labs:sidebar-collapsed'

export function AppShell({ children }: { children: ReactNode }) {
  const { config, chats, deleteChat } = useChatStore()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  // The Dancing-with-Claude experience (root + per-figure routes) renders its own header and
  // progress UI; skip the chat sidebar there. The chat scaffold routes (/new, /chat, /projects)
  // still get the original AppShell. /explore is the SVG-animation sandbox and also runs
  // outside the sidebar so the stage gets full width.
  if (pathname === '/' || pathname.startsWith('/learn') || pathname.startsWith('/explore')) {
    return <div className="h-dvh">{children}</div>
  }

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
  }, [])

  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      return !c
    })
  }

  const handleDelete = (chatId: string) => {
    deleteChat(chatId)
    if (pathname === `/chat/${chatId}`) router.push('/new')
  }

  return (
    <div className="flex h-dvh">
      <Sidebar userName={config.userName} collapsed={collapsed} onToggle={toggleSidebar}>
        <SidebarNav>
          <SidebarNavItem href="/new" icon={Plus} label="New chat" />
          <SidebarNavItem href="/projects" icon={Folder} label="Projects" />
        </SidebarNav>

        {chats.length > 0 && (
          <SidebarSection label="Recents">
            {chats.map((chat) => (
              <SidebarChatItem
                key={chat.id}
                href={`/chat/${chat.id}`}
                onDelete={() => handleDelete(chat.id)}
              >
                {chat.title}
              </SidebarChatItem>
            ))}
          </SidebarSection>
        )}
      </Sidebar>

      <div
        className={cn(
          'relative flex h-dvh flex-1 flex-col transition-[margin] duration-200',
          collapsed ? 'ml-[var(--sidebar-width-collapsed)]' : 'ml-[var(--sidebar-width)]',
        )}
      >
        {children}
      </div>
    </div>
  )
}
