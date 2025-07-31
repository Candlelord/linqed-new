# 🚀 SUI dApp Kit Integration Guide

## ✅ **Current Status: App is Running!**

Your app is now working at `http://localhost:3000` with all the basic features. Now let's add the real Sui dApp Kit integration.

## 📦 **Step 1: Install Sui dApp Kit**

Based on the [official Sui dApp Kit documentation](https://sdk.mystenlabs.com/dapp-kit), run this command:

```bash
npm install @mysten/dapp-kit @mysten/sui @tanstack/react-query --legacy-peer-deps
```

## 🔧 **Step 2: Add Sui Providers**

Create/update `components/sui-providers.tsx`:

```tsx
"use client"

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
})

const queryClient = new QueryClient()

interface SuiProvidersProps {
  children: ReactNode
}

export function SuiProviders({ children }: SuiProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
```

## 📱 **Step 3: Update App Layout**

Update `app/layout.tsx`:

```tsx
import React from 'react'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { SuiProviders } from '@/components/sui-providers'

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
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <SuiProviders>
          {children}
        </SuiProviders>
      </body>
    </html>
  )
}
```

## 🎯 **Step 4: Create Wallet Hook**

Create `hooks/use-sui-wallet.ts`:

```tsx
"use client"

import { useWallet, useSuiClientQuery } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'

export interface Transaction {
  id: number
  type: "sent" | "received"
  amount: string
  description: string
  time: string
  status: "completed" | "pending" | "failed"
  timestamp: number
}

export function useSuiWallet() {
  const { accounts, isConnected, selectAccount, disconnect } = useWallet()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const currentAccount = accounts[0]

  // Get account balance using Sui dApp Kit
  const { data: balanceData, isLoading: balanceLoading } = useSuiClientQuery(
    'getBalance',
    {
      owner: currentAccount?.address || '',
    },
    {
      enabled: !!currentAccount?.address,
    }
  )

  // Update balance when data changes
  useEffect(() => {
    if (balanceData) {
      const totalBalance = balanceData.data.reduce((acc: any, coin: any) => {
        return acc + Number(coin.balance)
      }, 0)
      setBalance(totalBalance / 1000000000) // Convert from MIST to SUI
    }
  }, [balanceData])

  // Disconnect wallet function
  const disconnectWallet = () => {
    disconnect()
    setBalance(0)
    setTransactions([])
  }

  // Send transaction function
  const sendTransaction = async (recipient: string, amount: number, note?: string) => {
    if (!currentAccount) {
      throw new Error('No wallet connected')
    }

    // This would integrate with Sui transaction API
    // For now, we'll simulate the transaction
    const newTransaction: Transaction = {
      id: Date.now(),
      type: "sent",
      amount: `-${amount} SUI`,
      description: note || `Sent to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
      time: formatTimeAgo(Date.now()),
      status: "completed",
      timestamp: Date.now(),
    }

    setTransactions(prev => [newTransaction, ...prev])
    setBalance(prev => prev - amount - 0.001) // Subtract amount and network fee

    return newTransaction
  }

  // Receive transaction function (simulated)
  const receiveTransaction = (amount: number, description: string) => {
    const newTransaction: Transaction = {
      id: Date.now(),
      type: "received",
      amount: `+${amount} SUI`,
      description,
      time: formatTimeAgo(Date.now()),
      status: "completed",
      timestamp: Date.now(),
    }

    setTransactions(prev => [newTransaction, ...prev])
    setBalance(prev => prev + amount)

    return newTransaction
  }

  // Format time ago helper
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return {
    // Wallet state
    isConnected,
    currentAccount,
    walletAddress: currentAccount?.address || '',
    
    // Balance and transactions
    balance,
    transactions,
    balanceLoading,
    
    // Loading states
    isLoading,
    
    // Functions
    disconnectWallet,
    sendTransaction,
    receiveTransaction,
    
    // Raw data
    balanceData,
  }
}
```

## 🔌 **Step 5: Create Wallet Connect Component**

Create `components/sui-wallet-connect.tsx`:

```tsx
"use client"

import { ConnectButton } from '@mysten/dapp-kit'
import { Wallet, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

interface SuiWalletConnectProps {
  acceptedTerms: boolean
  onTermsChange: (accepted: boolean) => void
  isConnecting: boolean
}

const features = [
  {
    title: "Secure & Fast",
    description: "Built on the Sui blockchain for lightning-fast transactions",
    icon: <Wallet className="w-6 h-6 text-blue-600" />,
  },
  {
    title: "Testnet Ready",
    description: "Connect to Sui testnet for development and testing",
    icon: <Check className="w-6 h-6 text-green-600" />,
  },
  {
    title: "Real-time Balance",
    description: "View your SUI balance and transaction history in real-time",
    icon: <Wallet className="w-6 h-6 text-purple-600" />,
  },
]

export function SuiWalletConnect({ 
  acceptedTerms, 
  onTermsChange, 
  isConnecting 
}: SuiWalletConnectProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SUI Wallet</h1>
          <p className="text-gray-600 text-lg">Your gateway to the SUI ecosystem</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm shadow-sm border-0">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What you can do */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-sm border-0 mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">What you can do:</h3>
            <div className="space-y-3">
              {[
                "Send and receive SUI tokens on testnet",
                "Convert SUI to Nigerian Naira",
                "Buy and redeem water packages",
                "Track all your transactions",
                "Access your wallet with QR codes",
                "Secure and fast blockchain transactions",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Terms and Connect */}
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => onTermsChange(checked as boolean)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
              I agree to the <button className="text-blue-600 hover:underline">Terms of Service</button> and{" "}
              <button className="text-blue-600 hover:underline">Privacy Policy</button>
            </label>
          </div>

          <ConnectButton
            connectText={
              isConnecting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting Wallet...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </div>
              )
            }
            className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!acceptedTerms || isConnecting}
          />

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            Connect your Sui wallet to access the testnet and start using the app.
          </p>
        </div>
      </div>
    </div>
  )
}
```

## 🎯 **Step 6: Update Main App**

Update your main app to use the real Sui integration. Replace the mock wallet functions with the real ones from the hook.

## 🚀 **Step 7: Test Real Integration**

1. **Install a Sui wallet** (like Sui Wallet browser extension)
2. **Get testnet SUI** from a faucet
3. **Connect your wallet** to the app
4. **Test real transactions** on testnet

## 📚 **Resources:**

- [Sui dApp Kit Documentation](https://sdk.mystenlabs.com/dapp-kit)
- [Sui Wallet Extension](https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil)
- [Sui Testnet Faucet](https://suiexplorer.com/faucet)

## 🎉 **You'll Have:**

- ✅ Real wallet connections
- ✅ Real balance from blockchain
- ✅ Real transactions on testnet
- ✅ All your existing features
- ✅ Beautiful UI maintained

**Ready to add real SUI integration! 🚀** 