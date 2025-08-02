"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSuiWallet } from "@/hooks/use-sui-wallet"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client"
import { NAIRA_TYPE } from "@/app/buy/constants"

export default function SendPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { balance, balanceLoading, currentAccount, addTransaction, nairaBalance, nairaBalanceLoading, nairaBalanceError, fetchNairaBalance } = useSuiWallet()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()
  const [loading, setLoading] = useState(false)
  const [txResult, setTxResult] = useState<{ success: boolean; message: string; txId?: string } | null>(null)
  const [nairaAmount, setNairaAmount] = useState<string | null>(null)
  const [convertLoading, setConvertLoading] = useState(false)
  const [currency, setCurrency] = useState<'SUI' | 'NAIRA'>('SUI')
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  
  const [sendForm, setSendForm] = useState({
    recipient: "",
    amount: "",
    note: "",
  })

  // Handle deeplink parameters
  useEffect(() => {
    const amountParam = searchParams.get('amount')
    const recipientParam = searchParams.get('recipient')
    
    if (amountParam || recipientParam) {
      setSendForm(prev => {
        const updates: Partial<typeof prev> = {}
        
        // Handle amount parameter
        if (amountParam && !isNaN(Number(amountParam)) && Number(amountParam) > 0) {
          updates.amount = amountParam
        }
        
        // Handle recipient parameter
        if (recipientParam && recipientParam.trim()) {
          updates.recipient = recipientParam.trim()
        }
        
        return { ...prev, ...updates }
      })
      
      // Clear the URL parameters after processing
      const url = new URL(window.location.href)
      url.searchParams.delete('amount')
      url.searchParams.delete('recipient')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  // Helper to fetch NAIRA coins with enough balance
  const getNairaCoinWithBalance = async (address: string, neededAmount: number) => {
    const provider = new SuiClient({ url: getFullnodeUrl('testnet') })
    const coins = await provider.getCoins({
      owner: address,
      coinType: NAIRA_TYPE,
    })
    // Find a coin with enough balance (convert to proper units)
    const neededAmountInUnits = Math.floor(neededAmount * 1000000000) // Convert to base units
    return coins.data.find((coin) => BigInt(coin.balance) >= BigInt(neededAmountInUnits))
  }

  // Validate Sui address format (should start with 0x and be 64 characters total)
  const isValidSuiAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{64}$/.test(address)
  }

  const isFormValid =
    sendForm.recipient &&
    isValidSuiAddress(sendForm.recipient) &&
    sendForm.amount &&
    Number.parseFloat(sendForm.amount) > 0 &&
    (currency === 'SUI' 
      ? Number.parseFloat(sendForm.amount) * 1000000000 <= balance * 1000000000 - 1000000 // Account for gas
      : Number.parseFloat(sendForm.amount) <= nairaBalance // Check NAIRA balance
    )

  const handleConvertToNaira = async () => {
    setConvertLoading(true)
    try {
      if (currency === 'SUI') {
        // Switch to NAIRA mode - clear amount for fresh entry
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=ngn')
        const data = await response.json()
        const suiToNaira = data.sui.ngn
        
        setExchangeRate(suiToNaira)
        
        // Show conversion info but clear amount for direct NAIRA entry
        if (sendForm.amount) {
          const convertedAmount = (parseFloat(sendForm.amount) * suiToNaira).toFixed(2)
          setNairaAmount(`Equivalent of ${sendForm.amount} SUI = ₦${convertedAmount}`)
        }
        
        setSendForm({ ...sendForm, amount: '' }) // Clear for direct NAIRA entry
        setCurrency('NAIRA')
      } else {
        // Switch back to SUI mode - clear amount for fresh entry
        setSendForm({ ...sendForm, amount: '' }) // Clear for direct SUI entry
        setCurrency('SUI')
        setNairaAmount(null)
      }
    } catch (error) {
      console.error('Error switching currency:', error)
      setNairaAmount('Error switching currency')
    } finally {
      setConvertLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || !currentAccount) return
    
    setLoading(true)
    setTxResult(null)
    
    try {
      const amount = Number.parseFloat(sendForm.amount)
      
      // Validate recipient address format
      if (!sendForm.recipient.startsWith('0x') || sendForm.recipient.length !== 66) {
        throw new Error('Invalid recipient address format. Address must start with 0x and be 66 characters long.')
      }
      
      // Create transaction using proper Sui SDK
      const tx = new Transaction()
      
      if (currency === 'SUI') {
        // Send SUI tokens
        const amountInMist = Math.floor(amount * 1000000000) // Convert SUI to MIST (1 SUI = 1,000,000,000 MIST)
        const [coin] = tx.splitCoins(tx.gas, [amountInMist])
        tx.transferObjects([coin], sendForm.recipient)
      } else {
        // Send NAIRA tokens - check cached balance first
        console.log('Attempting NAIRA transaction:')
        console.log('Amount to send:', amount)
        console.log('Available NAIRA balance:', nairaBalance)
        
        if (amount > nairaBalance) {
          throw new Error(`Insufficient NAIRA balance! Available: ${nairaBalance.toFixed(2)} NAIRA`)
        }
        
        // Get NAIRA coin for transaction (only when we know we have enough balance)
        const amountInUnits = Math.floor(amount * 1000000000) // Convert to base units
        console.log('Amount in units:', amountInUnits)
        console.log('Fetching NAIRA coin for address:', currentAccount.address)
        
        const nairaCoin = await getNairaCoinWithBalance(currentAccount.address, amount)
        console.log('NAIRA coin found:', nairaCoin)
        
        if (!nairaCoin) {
          // Refresh balance and show error
          fetchNairaBalance()
          throw new Error('NAIRA coins not found! Balance may have changed. Please try again.')
        }
        
        // Split the NAIRA coin for the exact amount and transfer
        const [nairaForTransfer] = tx.splitCoins(
          tx.object(nairaCoin.coinObjectId),
          [amountInUnits]
        )
        tx.transferObjects([nairaForTransfer], sendForm.recipient)
      }
      
      // Execute transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            console.log("Transaction successful:", result)
            
            // Add transaction to local state with proper currency info
            const currencySymbol = currency === 'SUI' ? 'SUI' : 'NAIRA'
            const description = sendForm.note 
              ? `Sent ${currencySymbol} to ${sendForm.recipient.slice(0, 8)}...${sendForm.recipient.slice(-6)} - ${sendForm.note}`
              : `Sent ${currencySymbol} to ${sendForm.recipient.slice(0, 8)}...${sendForm.recipient.slice(-6)}`
            addTransaction("sent", amount, description, currencySymbol)
            
            setTxResult({
              success: true,
              message: "Transaction sent successfully!",
              txId: result.digest
            })
            // Clear form
            setSendForm({ recipient: "", amount: "", note: "" })
            // Redirect after 2 seconds
            setTimeout(() => router.push("/"), 2000)
          },
          onError: (error) => {
            console.error("Transaction failed:", error)
            setTxResult({
              success: false,
              message: error.message || "Transaction failed. Please try again."
            })
          },
        }
      )
    } catch (error) {
      console.error("Transaction setup failed:", error)
      setTxResult({
        success: false,
        message: "Failed to create transaction. Please check the recipient address."
      })
    } finally {
      setLoading(false)
    }
  }

  const remainingBalance = sendForm.amount
    ? (currency === 'SUI' 
        ? (balance - Number.parseFloat(sendForm.amount || "0") - 0.001).toFixed(4)
        : (nairaBalance - Number.parseFloat(sendForm.amount || "0")).toFixed(2)
      )
    : (currency === 'SUI' ? balance.toFixed(4) : nairaBalance.toFixed(2))

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
          <h1 className="text-xl font-semibold">Send {currency}</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                  placeholder="0x1234567890abcdef..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    sendForm.recipient && !isValidSuiAddress(sendForm.recipient) 
                      ? 'border-red-300 bg-red-50' 
                      : ''
                  }`}
                  required
                />
                {sendForm.recipient && !isValidSuiAddress(sendForm.recipient) && (
                  <p className="text-xs text-red-600 mt-1">
                    Invalid Sui address format. Address should start with 0x and be 66 characters long.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={sendForm.amount}
                        onChange={(e) => {
                          setSendForm({ ...sendForm, amount: e.target.value })
                          setNairaAmount(null) // Reset conversion display when amount changes
                        }}
                        placeholder={currency === 'SUI' ? "0.0000" : "0.00"}
                        step={currency === 'SUI' ? "0.0001" : "0.01"}
                        min="0"
                        max={currency === 'SUI' ? balance - 0.001 : nairaBalance}
                        className="w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500">{currency}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConvertToNaira}
                      disabled={!sendForm.amount || convertLoading}
                      className="whitespace-nowrap"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${convertLoading ? 'animate-spin' : ''}`} />
                      {currency === 'SUI' ? 'Convert to ₦' : 'Convert to SUI'}
                    </Button>
                  </div>
                  {nairaAmount && (
                    <div className="text-sm text-gray-500">
                      Estimated value: {nairaAmount}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Available: {currency === 'SUI' 
                      ? (balanceLoading ? "..." : `${balance.toFixed(4)} SUI`)
                      : (nairaBalanceLoading ? "Loading NAIRA..." : nairaBalanceError ? "Error loading NAIRA" : `${nairaBalance.toFixed(2)} NAIRA`)
                    }
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={sendForm.note}
                  onChange={(e) => setSendForm({ ...sendForm, note: e.target.value })}
                  placeholder="What's this for?"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Transaction Result */}
              {txResult && (
                <Card className={`${txResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {txResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${txResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {txResult.success ? 'Success!' : 'Error'}
                      </span>
                    </div>
                    <p className={`text-sm ${txResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {txResult.message}
                    </p>
                    {txResult.txId && (
                      <p className="text-xs text-green-600 mt-2 font-mono break-all">
                        TX: {txResult.txId}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {isFormValid && !txResult && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-center mb-3">Transaction Summary</h3>
                  <div className="text-center text-2xl font-light mb-3">
                    {sendForm.amount} {currency}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network fee</span>
                      <span>~0.001 SUI</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining</span>
                      <span>{remainingBalance} {currency}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid || loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}