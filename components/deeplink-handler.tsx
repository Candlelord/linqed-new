"use client"

import { useEffect, useCallback, useState, useRef } from 'react'
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

// Global flag to prevent multiple handlers from running
let globalProcessingFlag = false

export default function DeeplinkHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { currentAccount } = useSuiWallet()
  const [mounted, setMounted] = useState(false)
  const processedRef = useRef(new Set<string>())
  const timeoutRef = useRef<NodeJS.Timeout>()

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
    if (!mounted || globalProcessingFlag) return
    
    // Skip if we're already on a target page (prevent loops)
    if (pathname.startsWith('/buy') || pathname.startsWith('/send') || pathname.startsWith('/receive')) {
      return
    }

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
      }
    }

    // Fallback to search params if no hash params
    if (!params.action && searchParams) {
      params.action = searchParams.get('action') as 'buy' | 'send' | 'receive'
      params.package = searchParams.get('package') as '100ml' | '200ml' | undefined
      params.currency = searchParams.get('currency')?.toUpperCase() as 'SUI' | 'NGN' | undefined
      params.amount = searchParams.get('amount') || undefined
      params.recipient = searchParams.get('recipient') || undefined
    }

    if (!params.action) {
      return
    }

    // Create a unique key for this deeplink to prevent duplicate processing
    const deeplinkKey = `${params.action}-${params.amount || ''}-${params.currency || ''}-${params.recipient || ''}-${params.package || ''}`
    
    if (processedRef.current.has(deeplinkKey)) {
      return
    }

    // Set global flag to prevent other handlers
    globalProcessingFlag = true
    processedRef.current.add(deeplinkKey)

    console.log('Processing deeplink:', params)

    // Check if wallet is connected before processing deeplink
    if (!currentAccount) {
      console.log('Wallet not connected, showing connection prompt')
      toast.info('Please connect your wallet to continue')
      // Reset flags to allow retry after connection
      globalProcessingFlag = false
      processedRef.current.delete(deeplinkKey)
      return
    }

    // Build query string for the target page
    const queryString = buildQueryString(params)

    try {
      switch (params.action) {
        case 'buy': {
          const url = queryString ? `/buy?${queryString}` : '/buy'
          await router.push(url)
          toast.success('Redirected to buy page')
          
          // Store deeplink completion info for post-action redirect
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('deeplink-completed', JSON.stringify({
              action: 'buy',
              timestamp: Date.now(),
              shouldRedirectHome: true
            }))
          }
          break
        }

        case 'send': {
          const url = queryString ? `/send?${queryString}` : '/send'
          await router.push(url)
          toast.success('Redirected to send page')
          
          // Store deeplink completion info for post-action redirect
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('deeplink-completed', JSON.stringify({
              action: 'send',
              timestamp: Date.now(),
              shouldRedirectHome: true
            }))
          }
          break
        }

        case 'receive': {
          await router.push('/receive')
          toast.success('Redirected to receive page')
          
          // Store deeplink completion info for post-action redirect
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('deeplink-completed', JSON.stringify({
              action: 'receive',
              timestamp: Date.now(),
              shouldRedirectHome: true
            }))
          }
          break
        }

        default:
          toast.error('Unknown action: ' + params.action)
      }
    } finally {
      // Reset global flag after a delay to allow navigation to complete
      setTimeout(() => {
        globalProcessingFlag = false
      }, 1000)
    }
  }, [mounted, searchParams, buildQueryString, router, pathname, currentAccount])

  // Mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Hash change listener
  useEffect(() => {
    if (!mounted) return

    const handleHashChange = () => {
      console.log('Hash changed, clearing processed cache')
      processedRef.current.clear()
      globalProcessingFlag = false
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [mounted])

  // Main deeplink handler with debouncing
  useEffect(() => {
    if (!mounted) return
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Debounce the deeplink handling to prevent rapid-fire executions
    timeoutRef.current = setTimeout(() => {
      handleDeeplink()
    }, 150)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [mounted, handleDeeplink])

  // Reset processed state when search params change
  useEffect(() => {
    if (searchParams?.toString()) {
      processedRef.current.clear()
      globalProcessingFlag = false
    }
  }, [searchParams])

  // Reset processed state when wallet connection changes
  useEffect(() => {
    if (currentAccount) {
      // Wallet connected, clear processed cache to allow deeplink retry
      processedRef.current.clear()
      globalProcessingFlag = false
    }
  }, [currentAccount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      globalProcessingFlag = false
    }
  }, [])

  return null
}