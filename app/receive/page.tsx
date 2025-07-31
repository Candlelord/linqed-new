"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSuiWallet } from "@/hooks/use-sui-wallet"

export default function ReceivePage() {
  const router = useRouter()
  const { walletAddress } = useSuiWallet()
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy address:", err)
    }
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`

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
          <h1 className="text-xl font-semibold">Receive SUI</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600 mb-6">
              Share your address to receive SUI
            </p>

            <div className="mb-6">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg inline-block">
                <img 
                  src={qrCodeUrl} 
                  alt="Wallet QR Code" 
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <p className="text-xs font-mono break-all">{walletAddress}</p>
              </div>

              <Button
                onClick={handleCopyAddress}
                variant="outline"
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Only send SUI tokens to this address
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}