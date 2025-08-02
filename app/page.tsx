"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, ArrowDownLeft, Clock, LogOut, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSuiWallet } from "@/hooks/use-sui-wallet"
import { SuiWalletConnect } from "@/components/sui-wallet-connect"
import { useDisconnectWallet } from "@mysten/dapp-kit"
import RecentTransactions from "@/components/recent-transactions"

export default function HomePage() {
  const router = useRouter()
  const { mutate: disconnect } = useDisconnectWallet()
  const {
    isConnected,
    walletAddress,
    balance,
    transactions,
    balanceLoading,
  } = useSuiWallet()

  const handleDisconnect = () => {
    disconnect()
  }

  if (!isConnected) {
    return <SuiWalletConnect />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        {/* Wallet Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-600">Wallet</p>
            <p className="text-xs font-mono text-gray-900">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Disconnect
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-light mb-6">
              {balanceLoading ? "Loading..." : `${balance.toFixed(4)} SUI`}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                className="flex-1 max-w-[120px]"
                onClick={() => router.push("/send")}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Send
              </Button>
              <Button
                variant="outline"
                className="flex-1 max-w-[120px]"
                onClick={() => router.push("/receive")}
              >
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Receive
              </Button>
              <Button
                variant="outline"
                className="flex-1 max-w-[120px]"
                onClick={() => router.push("/buy")}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Buy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-3">Recent Transactions</h3>
        </div>
        
        <RecentTransactions />
      </div>
    </div>
  )
}