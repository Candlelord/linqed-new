"use client"

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'

export default function DeeplinkPage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (!params?.params || !Array.isArray(params.params)) {
      router.push('/')
      return
    }

    const [action, ...args] = params.params

    console.log('Deeplink params:', { action, args })

    switch (action) {
      case 'send': {
        if (args.length >= 3) {
          const [amount, currency, recipient] = args
          const url = `/send?amount=${amount}&currency=${currency}&recipient=${recipient}`
          console.log('Redirecting to:', url)
          router.push(url)
          toast.success('Redirected to send page')
        } else {
          toast.error('Invalid send parameters')
          router.push('/send')
        }
        break
      }

      case 'buy': {
        if (args.length >= 2) {
          const [packageSize, currency] = args
          const url = `/buy?package=${packageSize}&currency=${currency}`
          console.log('Redirecting to:', url)
          router.push(url)
          toast.success('Redirected to buy page')
        } else {
          toast.error('Invalid buy parameters')
          router.push('/buy')
        }
        break
      }

      case 'receive': {
        router.push('/receive')
        toast.success('Redirected to receive page')
        break
      }

      default: {
        toast.error('Unknown deeplink action')
        router.push('/')
      }
    }
  }, [params, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing deeplink...</p>
      </div>
    </div>
  )
}
