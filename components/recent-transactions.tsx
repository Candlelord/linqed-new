"use client"

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { useSuiWallet } from "@/hooks/use-sui-wallet"

// Using the Transaction interface from the useSuiWallet hook
// This will display only transactions performed through the website

export default function RecentTransactions() {
  const { currentAccount, transactions, isLoading } = useSuiWallet()

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4 animate-spin" />
        <p className="text-sm">Loading transactions...</p>
      </div>
    )
  }

  // No error handling needed for local transactions

  if (!currentAccount) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <p className="text-sm">Connect your wallet to see transactions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">

        {transactions && transactions.length > 0 ? (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.status === 'completed' 
                    ? (tx.type === 'sent' ? 'bg-red-100' : 'bg-green-100')
                    : tx.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {tx.status === 'completed' ? (
                    tx.type === 'sent' ? (
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    )
                  ) : tx.status === 'pending' ? (
                    <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {tx.type === 'sent' 
                      ? (tx.amount.includes('NAIRA') ? 'Sent NAIRA' : 'Sent SUI')
                      : (tx.amount.includes('NAIRA') ? 'Received NAIRA' : 'Received SUI')
                    }
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      tx.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : tx.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {tx.time}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {tx.description}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium text-sm ${
                  tx.type === 'sent' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {tx.amount}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-sm">No transactions yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
