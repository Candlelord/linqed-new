
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSuiWallet } from "@/hooks/use-sui-wallet"
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit"
import { TransactionBlock } from "@mysten/sui.js/transactions"
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client"
import { PACKAGE_ID, RECIPIENT, NAIRA_TYPE } from "@/app/buy/constants"

const DISPENSER_MODULE = "dispenser"
const CONVERT_FN = "buyNaira"
const BUY_DIRECTLY_FN = "buyDirectly"

const DISPENSER_PACKAGE = PACKAGE_ID 
const DISPENSER_RECIPIENT = RECIPIENT 

// Helper to fetch Coin<NAIRA> with enough balance
async function getNairaCoinWithBalance(address: string, neededAmount: string | number) {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet' | undefined
  const provider = new SuiClient({ url: getFullnodeUrl(network || 'testnet') })
  const coins = await provider.getCoins({
    owner: address,
    coinType: NAIRA_TYPE,
  })
  // Find a coin with enough balance
  return coins.data.find((coin) => BigInt(coin.balance) >= BigInt(neededAmount))
}

export default function BuyPage() {
  const router = useRouter()
  const { balance, currentAccount, addTransaction, nairaBalance, nairaBalanceLoading, nairaBalanceError } = useSuiWallet()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const [loading, setLoading] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(true)
  


  // Fetch current SUI to NGN exchange rate
  useEffect(() => {
    async function fetchExchangeRate() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=ngn"
        )
        const data = await response.json()
        setExchangeRate(data.sui.ngn)
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error)
      } finally {
        setRateLoading(false)
      }
    }
    fetchExchangeRate()
  }, [])

  // Convert SUI to Naira
  const convertToNaira = (suiAmount: number) => {
    if (!exchangeRate) return "Loading..."
    const nairaAmount = Math.round((suiAmount * exchangeRate) / 10) * 10 // nearest ₦10
    return `₦${nairaAmount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`
  }

  // Helper: get amount in MIST (1 SUI = 1_000_000_000 MIST)
  const toMist = (sui: number) => Math.floor(sui * 1_000_000_000)
  const toNairaUnits = (naira: number) => Math.floor(naira * 1_000_000_000)




  // Main buy handler
  const handleBuy = async (
    item: "100ml" | "200ml",
    suiAmount: number,
    currency: "SUI" | "NGN"
  ) => {
    if (!currentAccount) {
      alert("Connect your wallet first.")
      return
    }
    setLoading(true)
    try {
      const txb = new TransactionBlock()
      
      if (currency === "SUI") {
        // Split the SUI coin for the exact amount
        const [coin] = txb.splitCoins(txb.gas, [toMist(suiAmount)])
        // Call buyDirectly
        txb.moveCall({
          target: `${DISPENSER_PACKAGE}::${DISPENSER_MODULE}::${BUY_DIRECTLY_FN}`,
          arguments: [
            coin,
            txb.pure.string(item), // item name
            txb.pure(toMist(suiAmount)), // amount in MIST
          ],
        })
      } else {
        // NAIRA path - check cached balance first
        const neededAmountInNaira = suiAmount // This is already the NAIRA amount needed
        
        if (neededAmountInNaira > nairaBalance) {
          alert(`Insufficient NAIRA balance! Available: ${nairaBalance.toFixed(2)} NAIRA, Required: ${neededAmountInNaira.toFixed(2)} NAIRA`)
          setLoading(false)
          return
        }
        
        // Determine NAIRA coins owned
        const providerNetwork = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'
        const provider = new SuiClient({ url: getFullnodeUrl(providerNetwork as any) })
        const coins = await provider.getCoins({ owner: currentAccount.address, coinType: NAIRA_TYPE })
        if (!coins.data.length) {
          alert('No NAIRA coins found in your wallet')
          setLoading(false)
          return
        }

        const neededAmount = toNairaUnits(suiAmount)
        // Try to find a single coin big enough
        let primaryCoinId = coins.data.find(c => BigInt(c.balance) >= BigInt(neededAmount))?.coinObjectId

        // If none big enough, merge the first two (or more) coins
        if (!primaryCoinId) {
          // Take the first coin as primary
          primaryCoinId = coins.data[0].coinObjectId
          const mergeTargets = coins.data.slice(1).map(c => txb.object(c.coinObjectId))
          mergeTargets.forEach(targetObj => {
            txb.mergeCoins(txb.object(primaryCoinId!), [targetObj])
          })
        }

        // After potential merge, split out the exact amount
        const [nairaForTx] = txb.splitCoins(
          txb.object(primaryCoinId!),
          [neededAmount]
        )
        txb.moveCall({
          target: `${DISPENSER_PACKAGE}::${DISPENSER_MODULE}::${CONVERT_FN}`,
          arguments: [
            nairaForTx,
            txb.object(DISPENSER_RECIPIENT),
            txb.pure.string(item),
            txb.pure(neededAmount),
          ],
        })
      }

      // Sign and execute
      signAndExecute({
        transaction: txb.serialize()
      }, {
        onSuccess: (result: { digest: string }) => {
          // Add transaction to local state for UI update
          const description = `Bought ${item} water package with ${currency}`
          const amount = currency === "SUI" ? suiAmount : suiAmount
          addTransaction("sent", amount, description, currency)
          
          alert("Purchase successful! TX: " + result.digest)
          setLoading(false)
        },
        onError: (error: Error) => {
          alert("Transaction failed: " + (error.message || error))
          setLoading(false)
        }
      })
    } catch (error) {
      alert("Error: " + (error as any).message)
      setLoading(false)
    }
  }

return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b">
        <div className="flex items-center px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Buy Tokens</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* 100ml Option */}
        <Card>
          <CardContent className="p-6">
            <div className="text-xl font-semibold mb-4">100ml Package</div>
            <div className="text-gray-600 mb-6">
              <p className="mb-1">Price: 0.1 SUI</p>
              <p className="text-sm">{rateLoading ? "Loading naira price..." : convertToNaira(0.1)}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleBuy("100ml", 0.1, "SUI")}
                disabled={loading}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Buy with SUI
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleBuy("100ml", exchangeRate ? Math.round((0.1 * exchangeRate)/10)*10 : 0, "NGN") }
                disabled={loading}
              >
                <span className="mr-2">₦</span>
                Buy with Naira
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 200ml Option */}
        <Card>
          <CardContent className="p-6">
            <div className="text-xl font-semibold mb-4">200ml Package</div>
            <div className="text-gray-600 mb-6">
              <p className="mb-1">Price: 0.2 SUI</p>
              <p className="text-sm">{rateLoading ? "Loading naira price..." : convertToNaira(0.2)}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleBuy("200ml", 0.2, "SUI")}
                disabled={loading}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Buy with SUI
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleBuy("200ml", exchangeRate ? Math.round((0.2 * exchangeRate)/10)*10 : 0, "NGN") }
                disabled={loading}
              >
                <span className="mr-2">₦</span>
                Buy with Naira
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}