"use client"

import { useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

interface DeeplinkCompletion {
  action: 'buy' | 'send' | 'receive'
  timestamp: number
  shouldRedirectHome: boolean
}

export default function PostActionRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  const handlePostActionRedirect = useCallback(() => {
    if (typeof window === 'undefined') return

    // Check if we have a completed deeplink action
    const completionData = sessionStorage.getItem('deeplink-completed')
    if (!completionData) return

    try {
      const completion: DeeplinkCompletion = JSON.parse(completionData)
      
      // Check if this is a recent completion (within last 30 seconds)
      const isRecent = Date.now() - completion.timestamp < 30000
      
      if (!isRecent || !completion.shouldRedirectHome) {
        // Clean up old completion data
        sessionStorage.removeItem('deeplink-completed')
        return
      }

      // Check if we're on a transaction completion page or success state
      // This could be detected by URL patterns, success messages, or other indicators
      const isOnActionPage = pathname.startsWith('/buy') || pathname.startsWith('/send') || pathname.startsWith('/receive')
      
      if (isOnActionPage) {
        // Look for success indicators in the page
        // For now, we'll use a simple timeout approach
        // In a real app, you'd listen for transaction success events
        const checkForCompletion = () => {
          // Check for success indicators (this is a simplified approach)
          const hasSuccessToast = document.querySelector('[data-sonner-toast]')?.textContent?.includes('success')
          const hasSuccessMessage = document.querySelector('.success, .completed, [data-success]')
          
          if (hasSuccessToast || hasSuccessMessage) {
            console.log('Action completed, redirecting to home page')
            
            // Clear the completion data
            sessionStorage.removeItem('deeplink-completed')
            
            // Show success message and redirect
            toast.success(`${completion.action.charAt(0).toUpperCase() + completion.action.slice(1)} completed! Redirecting to home...`)
            
            setTimeout(() => {
              router.push('/')
            }, 2000)
          }
        }

        // Check immediately and then periodically
        checkForCompletion()
        const interval = setInterval(checkForCompletion, 1000)
        
        // Clean up after 30 seconds
        setTimeout(() => {
          clearInterval(interval)
          sessionStorage.removeItem('deeplink-completed')
        }, 30000)
      }
    } catch (error) {
      console.error('Error processing post-action redirect:', error)
      sessionStorage.removeItem('deeplink-completed')
    }
  }, [router, pathname])

  useEffect(() => {
    // Small delay to ensure page is loaded
    const timer = setTimeout(handlePostActionRedirect, 1000)
    return () => clearTimeout(timer)
  }, [handlePostActionRedirect, pathname])

  return null
}
