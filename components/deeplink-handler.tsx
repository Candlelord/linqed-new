"use client"

import { useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSuiWallet } from '@/hooks/use-sui-wallet'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { toast } from 'sonner'
import { PACKAGE_ID, RECIPIENT } from '@/app/buy/constants'

const DISPENSER_MODULE = "dispenser"
const CONVERT_FN = "buyNaira"
const BUY_DIRECTLY_FN = "buyDirectly"

interface DeeplinkTransaction {
  action: 'buy' | 'send' | 'receive'
  package?: '100ml' | '200ml'
  currency?: 'SUI' | 'NGN'
  amount?: string
  recipient?: string
}

export default function DeeplinkHandler() {
  const searchParams = useSearchParams()
  const { currentAccount, addTransaction } = useSuiWallet()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  // Helper functions
  const toMist = useCallback((sui: number) => Math.floor(sui * 1_000_000_000), [])
  const toNairaUnits = useCallback((naira: number) => Math.floor(naira * 1_000_000_000), [])

  const buildTransaction = useCallback((params: DeeplinkTransaction): TransactionBlock | null => {
    try {
      const txb = new TransactionBlock()

      switch (params.action) {
        case 'buy': {
          if (!params.package || !params.currency) return null
          const suiAmount = params.package === '100ml' ? 0.1 : 0.2

          if (params.currency === 'SUI') {
            const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(toMist(suiAmount))])
            txb.moveCall({
              target: `${PACKAGE_ID}::${DISPENSER_MODULE}::${BUY_DIRECTLY_FN}`,
              arguments: [
                coin,
                txb.pure.string(params.package),
                txb.pure.u64(toMist(suiAmount)),
              ],
            })
          } else if (params.currency === 'NGN') {
            const nairaAmount = params.package === '100ml' ? 0.00053823 : 0.107646
            const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(toNairaUnits(nairaAmount))])
            txb.moveCall({
              target: `${PACKAGE_ID}::${DISPENSER_MODULE}::${CONVERT_FN}`,
              arguments: [
                coin,
                txb.object(RECIPIENT),
                txb.pure.string(params.package),
                txb.pure.u64(toNairaUnits(nairaAmount)),
              ],
            })
          }
          break
        }

        case 'send': {
          if (!params.amount || !params.recipient || !params.currency) return null
          
          // For SUI transfers, use standard Sui SDK methods
          if (params.currency === 'SUI') {
            const amount = toMist(parseFloat(params.amount))
            const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(amount)])
            txb.transferObjects([coin], params.recipient)
          } else {
            // For other currencies, you would need your custom module
            // This is a placeholder - implement based on your token contract
            toast.error('Non-SUI transfers not implemented yet')
            return null
          }
          break
        }

        case 'receive': {
          // Receive functionality typically doesn't require a transaction
          // It's usually just generating a QR code or address to share
          // Redirect to receive page instead of creating a transaction
          if (typeof window !== 'undefined') {
            const receiveUrl = `/receive?amount=${params.amount}&currency=${params.currency}`
            window.location.href = receiveUrl
          }
          return null
        }

        default:
          return null
      }

      return txb
    } catch (error) {
      console.error('Error building transaction:', error)
      return null
    }
  }, [toMist, toNairaUnits])

  const handleDeeplink = useCallback(async () => {
    try {
      const action = searchParams.get('action') as DeeplinkTransaction['action']
      if (!action) {
        toast.error('Invalid action parameter')
        return
      }

      const params: DeeplinkTransaction = { action }

      // Add relevant parameters based on action
      switch (action) {
        case 'buy':
          params.package = searchParams.get('package') as '100ml' | '200ml'
          params.currency = searchParams.get('currency') as 'SUI' | 'NGN'
          if (!params.package || !params.currency) {
            toast.error('Missing required parameters for buy action')
            return
          }
          break

        case 'send':
          params.amount = searchParams.get('amount') || undefined
          params.currency = searchParams.get('currency') as 'SUI' | 'NGN'
          params.recipient = searchParams.get('recipient') || undefined
          if (!params.amount || !params.currency || !params.recipient) {
            toast.error('Missing required parameters for send action')
            return
          }
          break

        case 'receive':
          params.amount = searchParams.get('amount') || undefined
          params.currency = searchParams.get('currency') as 'SUI' | 'NGN'
          if (!params.amount || !params.currency) {
            toast.error('Missing required parameters for receive action')
            return
          }
          break

        default:
          toast.error('Invalid action type')
          return
      }

      // Store parameters if wallet not connected
      if (!currentAccount) {
        localStorage.setItem('pendingDeeplink', JSON.stringify({
          params,
          timestamp: Date.now()
        }))
        toast.error('Please connect your wallet first')
        return
      }

      const txb = buildTransaction(params)
      if (!txb) {
        toast.error('Failed to build transaction')
        return
      }

      signAndExecute(
        { transaction: txb.serialize() },
        {
          onSuccess: (result: { digest: string }) => {
            toast.success('Transaction successful!', {
              description: `TX: ${result.digest.slice(0, 8)}...`,
            })
            // Record transaction locally for UI update
            try {
              if (params.action === 'send' && params.amount && params.recipient && params.currency) {
                const amountNum = parseFloat(params.amount)
                const shortAddr = params.recipient.slice(0, 4) + '...' + params.recipient.slice(-4)
                addTransaction('sent', amountNum, `Sent to ${shortAddr}`, params.currency)
              } else if (params.action === 'buy' && params.package && params.currency) {
                const amountNum = params.package === '100ml'
                  ? (params.currency === 'SUI' ? 0.1 : 0.00053823)
                  : (params.currency === 'SUI' ? 0.2 : 0.107646)
                addTransaction('sent', amountNum, `Bought ${params.package}`, params.currency)
              }
            } catch (error) {
              console.error('Failed to add recent transaction:', error)
            }
            toast.success('Transaction successful!', {
              description: `TX: ${result.digest.slice(0, 8)}...`,
            })
          },
          onError: (error: Error) => {
            toast.error('Transaction failed', {
              description: error.message,
            })
          },
        }
      )
    } catch (error) {
      console.error('Deeplink error:', error)
      toast.error('Failed to process deeplink')
    }
  }, [searchParams, currentAccount, buildTransaction, signAndExecute])

  // Process deeplink on mount or when wallet connects
  useEffect(() => {
    if (searchParams.toString()) {
      handleDeeplink()
    }
  }, [searchParams, currentAccount, handleDeeplink])

  return null
}