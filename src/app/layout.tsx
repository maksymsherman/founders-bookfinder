import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '@/components'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Founders Podcast Book Finder',
  description: 'Discover book recommendations from the Founders Podcast with current pricing information',
  keywords: 'founders podcast, book recommendations, entrepreneurship, business books',
  metadataBase: new URL('https://founders-bookfinder.vercel.app'),
  openGraph: {
    title: 'Founders Podcast Book Finder',
    description: 'Discover book recommendations from the Founders Podcast with current pricing information',
    url: 'https://founders-bookfinder.vercel.app',
    siteName: 'Founders Book Finder',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Founders Podcast Book Finder',
    description: 'Discover book recommendations from the Founders Podcast with current pricing information',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
} 