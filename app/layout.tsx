import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { SuiProviders } from '@/components/sui-providers'
import { Providers } from './providers'
import DeeplinkHandler from '@/components/deeplink-handler'

export const metadata: Metadata = {
  title: 'SUI Wallet App',
  description: 'A SUI wallet application with testnet support',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <SuiProviders>
            <Suspense fallback={null}>
              <DeeplinkHandler />
            </Suspense>
            {children}
          </SuiProviders>
        </Providers>
      </body>
    </html>
  )
}
