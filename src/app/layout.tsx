import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ChatProvider } from '@/lib/chat-store'
import { LearnProvider } from '@/lib/learn-store'
import { AppShell } from './shell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Five Shapes',
  description: 'A five-level in-app learning experience for Claude Code usage patterns.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ChatProvider>
          <LearnProvider>
            <AppShell>{children}</AppShell>
          </LearnProvider>
        </ChatProvider>
      </body>
    </html>
  )
}
