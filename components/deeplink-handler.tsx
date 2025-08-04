"use client"

import { useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()
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

  // Parse deeplink parameters from URL hash or pathname
  const parseDeeplinkParams = useCallback((): DeeplinkTransaction | null => {
    let params: DeeplinkTransaction = {
      action: null as any,
      package: undefined,
      currency: undefined,
      amount: undefined,
      recipient: undefined,
    }

    // Method 1: Check URL search params (normal query parameters)
    if (searchParams) {
      params.action = searchParams.get('action') as 'buy' | 'send' | 'receive'
      params.package = searchParams.get('package') as '100ml' | '200ml' | undefined
      params.currency = searchParams.get('currency')?.toUpperCase() as 'SUI' | 'NGN' | undefined
      params.amount = searchParams.get('amount') || undefined
      params.recipient = searchParams.get('recipient') || undefined
    }

    // Method 2: Check URL hash for parameters (for Slush wallet compatibility)
    if (!params.action && typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('?')) {
        const hashParams = new URLSearchParams(hash.split('?')[1])
        params.action = hashParams.get('action') as 'buy' | 'send' | 'receive'
        params.package = hashParams.get('package') as '100ml' | '200ml' | undefined
        params.currency = hashParams.get('currency')?.toUpperCase() as 'SUI' | 'NGN' | undefined
        params.amount = hashParams.get('amount') || undefined
        params.recipient = hashParams.get('recipient') || undefined
      }
    }

    // Method 3: Check for encoded parameters in pathname (for Slush wallet)
    if (!params.action && pathname) {
      // Look for patterns like /send/0.5/SUI/0x123... in the pathname
      const pathParts = pathname.split('/')
      if (pathParts.includes('send') && pathParts.length >= 5) {
        const sendIndex = pathParts.indexOf('send')
        params.action = 'send'
        params.amount = pathParts[sendIndex + 1]
        params.currency = pathParts[sendIndex + 2]?.toUpperCase() as 'SUI' | 'NGN'
        params.recipient = pathParts[sendIndex + 3]
      } else if (pathParts.includes('buy') && pathParts.length >= 4) {
        const buyIndex = pathParts.indexOf('buy')
        params.action = 'buy'
        params.package = pathParts[buyIndex + 1] as '100ml' | '200ml'
        params.currency = pathParts[buyIndex + 2]?.toUpperCase() as 'SUI' | 'NGN'
      }
    }

    return params.action ? params : null
  }, [searchParams, pathname])

  const handleDeeplink = useCallback(async () => {
    const params = parseDeeplinkParams()
    if (!params) return

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
  }, [parseDeeplinkParams, buildQueryString, router])

  useEffect(() => {
    // Handle deeplink from any source (query params, hash, or pathname)
    handleDeeplink()
  }, [handleDeeplink])

  return null
}