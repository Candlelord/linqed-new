"use client"

import { useEffect, useCallback, useState } from 'react'
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
  const [mounted, setMounted] = useState(false)
  const [processed, setProcessed] = useState(false)

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
    if (!mounted || processed) return
    
    // Debug logging
    console.log('=== DEEPLINK DEBUG ===')
    console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    console.log('Hash:', typeof window !== 'undefined' ? window.location.hash : 'N/A')
    console.log('Search params:', searchParams?.toString())
    console.log('Mounted:', mounted, 'Processed:', processed)
    console.log('======================')

    let params: DeeplinkTransaction = {
      action: null as any,
      package: undefined,
      currency: undefined,
      amount: undefined,
      recipient: undefined,
    }

    // First try to get from URL hash (for Slush wallet)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1) // Remove the # symbol
      if (hash) {
        const hashParams = new URLSearchParams(hash)
        params.action = hashParams.get('action') as 'buy' | 'send' | 'receive'
        params.package = hashParams.get('package') as '100ml' | '200ml' | undefined
        params.currency = hashParams.get('currency')?.toUpperCase() as 'SUI' | 'NGN' | undefined
        params.amount = hashParams.get('amount') || undefined
        params.recipient = hashParams.get('recipient') || undefined
        
        console.log('Hash params found:', params)
      }
    }

    // Fallback to search params if no hash params
    if (!params.action && searchParams) {
      params.action = searchParams.get('action') as 'buy' | 'send' | 'receive'
      params.package = searchParams.get('package') as '100ml' | '200ml' | undefined
      params.currency = searchParams.get('currency')?.toUpperCase() as 'SUI' | 'NGN' | undefined
      params.amount = searchParams.get('amount') || undefined
      params.recipient = searchParams.get('recipient') || undefined
      
      console.log('Search params found:', params)
    }

    if (!params.action) {
      console.log('No deeplink action found')
      return
    }

    console.log('Processing deeplink:', params)
    setProcessed(true) // Mark as processed to prevent multiple executions

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
  }, [mounted, processed, searchParams, buildQueryString, router])

  // Mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Hash change listener
  useEffect(() => {
    if (!mounted) return

    const handleHashChange = () => {
      console.log('Hash changed, resetting processed state')
      setProcessed(false)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [mounted])

  // Main deeplink handler
  useEffect(() => {
    if (!mounted) return
    
    // Small delay to ensure everything is ready
    const timer = setTimeout(() => {
      handleDeeplink()
    }, 100)

    return () => clearTimeout(timer)
  }, [mounted, handleDeeplink])

  // Reset processed state when search params change
  useEffect(() => {
    if (searchParams?.toString()) {
      setProcessed(false)
    }
  }, [searchParams])

  return null
}