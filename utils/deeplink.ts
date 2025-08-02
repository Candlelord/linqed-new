export interface DeeplinkParams {
  action: 'buy' | 'send' | 'receive'
  amount?: string
  currency?: 'SUI' | 'NGN'
  package?: '100ml' | '200ml'
}

export function parseDeeplink(url: string): DeeplinkParams | null {
  try {
    const urlParams = new URLSearchParams(url.split('?')[1])
    const params: DeeplinkParams = {
      action: urlParams.get('action') as DeeplinkParams['action'],
      amount: urlParams.get('amount') || undefined,
      currency: urlParams.get('currency') as DeeplinkParams['currency'],
      package: urlParams.get('package') as DeeplinkParams['package']
    }
    
    // Validate action
    if (!params.action || !['buy', 'send', 'receive'].includes(params.action)) {
      return null
    }
    
    return params
  } catch (error) {
    console.error('Failed to parse deeplink:', error)
    return null
  }
}
