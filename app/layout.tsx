import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthCallbackHandler from '@/components/AuthCallbackHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Owen's Stag 2026 - Payments",
  description: 'Payment tracker for Owen\'s Stag 2026 - Bournemouth',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthCallbackHandler />
        {children}
      </body>
    </html>
  )
}

