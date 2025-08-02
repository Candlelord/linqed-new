"use client"

import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NAIRA_TYPE } from '@/app/buy/constants'

export interface Transaction {
  id: number
  type: "sent" | "received"
  amount: string
  description: string
  time: string
  status: "completed" | "pending" | "failed"
  timestamp: number
}

export function useSuiWallet() {
  const account = useCurrentAccount()
  const [balance, setBalance] = useState(0)
  const [nairaBalance, setNairaBalance] = useState(0)
  const [nairaBalanceLoading, setNairaBalanceLoading] = useState(false)
  const [nairaBalanceError, setNairaBalanceError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Load transactions from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('linqed-transactions')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (error) {
          console.error('Error loading transactions from localStorage:', error)
        }
      }
      // Add some test transactions for debugging
      const testTransactions: Transaction[] = [
        {
          id: Date.now() - 1000,
          type: "sent",
          amount: "-1.5000 SUI",
          description: "Test transaction - Sent to 0x1234...abcd",
          time: "2 minutes ago",
          status: "completed",
          timestamp: Date.now() - 120000,
        },
        {
          id: Date.now() - 2000,
          type: "received",
          amount: "+2.0000 SUI",
          description: "Test transaction - Received from 0x5678...efgh",
          time: "1 hour ago",
          status: "completed",
          timestamp: Date.now() - 3600000,
        }
      ]
      // Save test transactions to localStorage
      localStorage.setItem('linqed-transactions', JSON.stringify(testTransactions))
      return testTransactions
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)

  // Get account balance using Sui dApp Kit
  const { data: balanceData, isLoading: balanceLoading } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
    },
    {
      enabled: !!account?.address,
    }
  )

  // Get owned objects (for transaction history)
  const { data: ownedObjects, isLoading: objectsLoading } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || '',
      options: {
        showContent: true,
        showDisplay: true,
      },
    },
    {
      enabled: !!account?.address,
    }
  )

  // Update balance when data changes
  useEffect(() => {
    if (balanceData?.totalBalance) {
      const totalBalance = Number(balanceData.totalBalance)
      setBalance(totalBalance / 1000000000) // Convert from MIST to SUI
    }
  }, [balanceData])

  // Fetch NAIRA balance with caching
  const fetchNairaBalance = async () => {
    if (!account?.address) return
    
    setNairaBalanceLoading(true)
    setNairaBalanceError(null)
    
    try {
      const provider = new SuiClient({ url: getFullnodeUrl('testnet') })
      console.log('Fetching NAIRA coins for address:', account.address)
      console.log('Using NAIRA_TYPE:', NAIRA_TYPE)
      
      const coins = await provider.getCoins({
        owner: account.address,
        coinType: NAIRA_TYPE,
      })
      
      console.log('NAIRA coins found:', coins.data.length)
      console.log('NAIRA coins data:', coins.data)
      
      // Calculate total NAIRA balance
      const totalBalance = coins.data.reduce((sum, coin) => {
        console.log('Coin balance:', coin.balance)
        return sum + BigInt(coin.balance)
      }, BigInt(0))
      
      console.log('Total NAIRA balance (raw):', totalBalance.toString())
      
      // Convert from base units to NAIRA (assuming 9 decimals like SUI)
      const nairaAmount = Number(totalBalance) / 1000000000
      console.log('NAIRA balance (converted):', nairaAmount)
      setNairaBalance(nairaAmount)
      
      // Cache the balance with timestamp
      if (typeof window !== 'undefined') {
        const cacheData = {
          balance: nairaAmount,
          timestamp: Date.now(),
          address: account.address
        }
        localStorage.setItem('linqed-naira-balance', JSON.stringify(cacheData))
      }
    } catch (error) {
      console.error('Error fetching NAIRA balance:', error)
      setNairaBalanceError('Failed to load NAIRA balance')
    } finally {
      setNairaBalanceLoading(false)
    }
  }

  // Load cached NAIRA balance and fetch fresh data
  useEffect(() => {
    if (!account?.address) {
      setNairaBalance(0)
      return
    }
    
    // Load cached balance first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('linqed-naira-balance')
      if (cached) {
        try {
          const cacheData = JSON.parse(cached)
          const isRecent = Date.now() - cacheData.timestamp < 60000 // 1 minute cache
          const isSameAddress = cacheData.address === account.address
          
          if (isRecent && isSameAddress) {
            setNairaBalance(cacheData.balance)
            return // Use cached data, don't fetch
          }
        } catch (error) {
          console.error('Error loading cached NAIRA balance:', error)
        }
      }
    }
    
    // Fetch fresh balance
    fetchNairaBalance()
  }, [account?.address])

  // Add transaction to local state (for UI updates)
  const addTransaction = (type: "sent" | "received", amount: number, description: string, currency: string = "SUI") => {
    const newTransaction: Transaction = {
      id: Date.now(),
      type,
      amount: type === "sent" ? `-${amount} ${currency}` : `+${amount} ${currency}`,
      description,
      time: formatTimeAgo(Date.now()),
      status: "completed",
      timestamp: Date.now(),
    }

    const updatedTransactions = [newTransaction, ...transactions]
    setTransactions(updatedTransactions)
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('linqed-transactions', JSON.stringify(updatedTransactions))
    }
    
    console.log('Transaction added:', newTransaction)
    console.log('Total transactions:', updatedTransactions.length)
  }

  // Format time ago helper
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return {
    // Wallet state
    isConnected: !!account,
    currentAccount: account,
    walletAddress: account?.address || '',
    
    // Balance and transactions
    balance,
    nairaBalance,
    nairaBalanceLoading,
    nairaBalanceError,
    transactions,
    balanceLoading,
    objectsLoading,
    
    // Loading states
    isLoading,
    
    // Functions
    addTransaction,
    fetchNairaBalance,
    
    // Raw data
    balanceData,
    ownedObjects,
  }
} 