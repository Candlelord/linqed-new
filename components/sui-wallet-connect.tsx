"use client"

import { ConnectButton, useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit'
import { Wallet, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function SuiWalletConnect() {
  const account = useCurrentAccount()
  const router = useRouter()
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()

  // Debug: log available wallets
  useEffect(() => {
    console.log('Available wallets:', wallets)
  }, [wallets])

  // Redirect to home when wallet connects
  useEffect(() => {
    if (account) {
      console.log('Account connected:', account)
      router.push('/')
    }
  }, [account, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">SUI Wallet</h1>
          <p className="text-gray-600">Connect your wallet to get started</p>
        </div>

        {account && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Wallet Connected</span>
              </div>
              <p className="text-sm text-green-700 font-mono">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </p>
              <p className="text-xs text-green-600 mt-2">Redirecting...</p>
            </CardContent>
          </Card>
        )}

        <ConnectButton 
          connectText="Connect Wallet"
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
        />

        {/* Manual wallet connection options */}
        {wallets.filter(wallet => !wallet.name.toLowerCase().includes('burner')).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-600 text-center">Available Wallets:</p>
            {wallets
              .filter(wallet => !wallet.name.toLowerCase().includes('burner'))
              .map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => {
                    console.log('Connecting to wallet:', wallet.name)
                    connect({ wallet })
                  }}
                  className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 text-sm transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {wallet.icon && (
                      <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />
                    )}
                    <div>
                      <div className="font-medium">{wallet.name}</div>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}

        {wallets.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              No wallets detected. Please install a Sui wallet browser extension.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Connect your Sui wallet to access the app
        </p>
      </div>
    </div>
  )
}