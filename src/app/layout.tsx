import type { Metadata } from 'next'
import { Geist, Geist_Mono, Caveat } from 'next/font/google'
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

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Dancing with Claude',
  description:
    'A five-figure choreography for learning to direct Claude Code — built on Schlemmer’s Bauhaus dances.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} font-sans antialiased`}
      >
        <ChatProvider>
          <LearnProvider>
            <AppShell>{children}</AppShell>
          </LearnProvider>
        </ChatProvider>
      </body>
    </html>
  )
}
