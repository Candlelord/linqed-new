"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeeplinkPage() {
  const router = useRouter()

  useEffect(() => {
    // This route is deprecated - deeplinks are now handled by the global DeeplinkHandler component
    // Redirect to home to let the main handler process the deeplink from the URL hash/params
    console.log('Deprecated deeplink route accessed, redirecting to home')
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
