"use client"

import { useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSuiWallet } from '@/hooks/use-sui-wallet'
import { toast } from 'sonner'

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
  const router = useRouter()
  const { currentAccount } = useSuiWallet()

  // Helper function to build query string from params
  const buildQueryString = useCallback((params: DeeplinkTransaction) => {
    const query = new URLSearchParams()
    if (params.package) query.set('package', params.package)
    if (params.currency) query.set('currency', params.currency)
    if (params.amount) query.set('amount', params.amount)
    if (params.recipient) query.set('recipient', params.recipient)
    return query.toString()
  }, [])

  const handleDeeplink = useCallback(async () => {
    // Debug logging
    console.log('=== DEEPLINK DEBUG ===')
    console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    console.log('Search params:', searchParams?.toString())
    console.log('All available params:')
    if (searchParams) {
      for (const [key, value] of searchParams.entries()) {
        console.log(`  ${key}: ${value}`)
      }
    }
    console.log('======================')

    if (!searchParams) return

    const params: DeeplinkTransaction = {
      action: searchParams.get('action') as 'buy' | 'send' | 'receive',
      package: searchParams.get('package') as '100ml' | '200ml' | undefined,
      currency: searchParams.get('currency')?.toUpperCase() as 'SUI' | 'NGN' | undefined,
      amount: searchParams.get('amount') || undefined,
      recipient: searchParams.get('recipient') || undefined,
    }

    if (!params.action) return

    console.log('Processing deeplink:', params)

    // Build query string for the target page
    const queryString = buildQueryString(params)

    switch (params.action) {
      case 'buy': {
        // Navigate to buy page with prefilled data
        const url = queryString ? `/buy?${queryString}` : '/buy'
        router.push(url)
        toast.success('Redirected to buy page')
        break
      }

      case 'send': {
        // Navigate to send page with prefilled data
        const url = queryString ? `/send?${queryString}` : '/send'
        router.push(url)
        toast.success('Redirected to send page')
        break
      }

      case 'receive': {
        // Navigate to receive page
        router.push('/receive')
        toast.success('Redirected to receive page')
        break
      }

      default:
        toast.error('Unknown action: ' + params.action)
    }
  }, [searchParams, buildQueryString, router])

  useEffect(() => {
    // Only handle deeplink if we have query parameters
    if (searchParams && searchParams.get('action')) {
      handleDeeplink()
    }
  }, [handleDeeplink, searchParams])

  return null
}