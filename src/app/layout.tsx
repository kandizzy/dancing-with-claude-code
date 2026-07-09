import type { Metadata } from 'next'
import { Geist, Geist_Mono, Caveat } from 'next/font/google'
import { LearnProvider } from '@/lib/learn-store'
import { AskSessionProvider } from '@/lib/ask-session-store'
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
  title: 'Dancing with Claude Code',
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
        <LearnProvider>
          {/* Inside LearnProvider: figure 1's completion chain needs awardShape + pin state.
              At the root (not per-page) so in-flight asks survive route changes. */}
          <AskSessionProvider>
            <div className="h-dvh">{children}</div>
          </AskSessionProvider>
        </LearnProvider>
      </body>
    </html>
  )
}
