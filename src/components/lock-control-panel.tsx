'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, LockOpen, Battery, RefreshCw, Loader2, AlertCircle, CheckCircle, Clock, CreditCard, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { InvoiceScanner } from './invoice-scanner'

interface LockControlPanelProps {
  lockName: string
}

interface LockState {
  state?: string
  lock_status?: string
  is_blocked?: boolean
}

interface BatteryInfo {
  battery_level?: number
}

interface MembershipInfo {
  isValid: boolean
  expiresAt?: string
  invoiceId?: string
}

export function LockControlPanel({ lockName }: LockControlPanelProps) {
  const [lockState, setLockState] = useState<LockState>({})
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({})
  const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null)
  const [loadingState, setLoadingState] = useState<'state' | 'battery' | 'membership' | null>(null)
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('control')
  const [apiRequestInProgress, setApiRequestInProgress] = useState(false)
  const [useMembershipUnlock, setUseMembershipUnlock] = useState(false)
  const [showInvoiceScanner, setShowInvoiceScanner] = useState(false)

  useEffect(() => {
    // Only fetch data when tab changes to avoid simultaneous requests
    if (activeTab === 'status') {
      fetchLockState()
    } else if (activeTab === 'battery') {
      fetchBatteryLevel()
    } else if (activeTab === 'control' && useMembershipUnlock) {
      checkMembershipStatus()
    }
  }, [activeTab, lockName, useMembershipUnlock])

  useEffect(() => {
    // Check for stored membership data on mount
    if (useMembershipUnlock) {
      const storedMembership = localStorage.getItem('ppke_membership')
      if (storedMembership) {
        try {
          const membershipData = JSON.parse(storedMembership)
          const expiresAt = new Date(membershipData.expiresAt)
          const now = new Date()
          
          if (expiresAt > now) {
            setMembershipInfo({
              isValid: true,
              expiresAt: membershipData.expiresAt,
              invoiceId: membershipData.invoiceId
            })
          } else {
            // Expired, remove from localStorage
            localStorage.removeItem('ppke_membership')
            checkMembershipStatus()
          }
        } catch (err) {
          console.error('Failed to parse stored membership:', err)
          localStorage.removeItem('ppke_membership')
        }
      }
    }
  }, [useMembershipUnlock])

  const fetchLockState = async () => {
    if (apiRequestInProgress) {
      toast.warning('Another request is in progress. Please wait.')
      return
    }

    try {
      setApiRequestInProgress(true)
      setLoadingState('state')
      const response = await fetch(`/api/v1/${encodeURIComponent(lockName)}/get-state`)

      if (!response.ok) {
        const error = await response.json()
        if (error.details?.result?.bridge_server_status_text === 'BridgeBusy') {
          toast.error('Bridge is busy. Please try again in a few seconds.')
        } else {
          toast.error('Failed to fetch lock state')
        }
        return
      }

      const data = await response.json()
      setLockState({
        state: data.state,
        lock_status: data.lock_status,
        is_blocked: data.is_blocked
      })
    } catch (err) {
      toast.error('Failed to fetch lock state')
    } finally {
      setLoadingState(null)
      setApiRequestInProgress(false)
    }
  }

  const fetchBatteryLevel = async () => {
    if (apiRequestInProgress) {
      toast.warning('Another request is in progress. Please wait.')
      return
    }

    try {
      setApiRequestInProgress(true)
      setLoadingState('battery')
      const response = await fetch(`/api/v1/${encodeURIComponent(lockName)}/battery-level`)

      if (!response.ok) {
        const error = await response.json()
        if (error.details?.result?.bridge_server_status_text === 'BridgeBusy') {
          toast.error('Bridge is busy. Please try again in a few seconds.')
        } else {
          toast.error('Failed to fetch battery level')
        }
        return
      }

      const data = await response.json()
      setBatteryInfo({
        battery_level: data.battery_level
      })
    } catch (err) {
      toast.error('Failed to fetch battery level')
    } finally {
      setLoadingState(null)
      setApiRequestInProgress(false)
    }
  }

  const checkMembershipStatus = async () => {
    const apiKey = localStorage.getItem('btcpay_api_key')
    if (!apiKey) {
      setMembershipInfo({ isValid: false })
      return
    }

    try {
      setLoadingState('membership')
      const response = await fetch(`/api/v1/${encodeURIComponent(lockName)}/unlock-member`, {
        headers: {
          'x-btcpay-api-key': apiKey
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Membership check failed:', error)
        setMembershipInfo({ isValid: false })
        return
      }

      const data = await response.json()
      setMembershipInfo({
        isValid: data.membership.isValid,
        expiresAt: data.membership.expiresAt,
        invoiceId: data.membership.mostRecentInvoice?.id
      })
    } catch (err) {
      console.error('Failed to check membership:', err)
      setMembershipInfo({ isValid: false })
    } finally {
      setLoadingState(null)
    }
  }

  const performOperation = async (operation: 'lock' | 'unlock') => {
    if (apiRequestInProgress) {
      toast.warning('Another request is in progress. Please wait.')
      return
    }

    // Check if this is an unlock operation with membership requirement
    if (operation === 'unlock' && useMembershipUnlock) {
      const apiKey = localStorage.getItem('btcpay_api_key')
      if (!apiKey) {
        toast.error('BTCPay API key required. Please configure it in settings.')
        return
      }

      try {
        setApiRequestInProgress(true)
        setOperationInProgress(operation)
        
        // Get stored membership data
        const storedMembership = localStorage.getItem('ppke_membership')
        let invoiceId = null
        if (storedMembership) {
          try {
            const membershipData = JSON.parse(storedMembership)
            invoiceId = membershipData.invoiceId
          } catch (err) {
            console.error('Failed to parse stored membership:', err)
          }
        }

        const response = await fetch(`/api/v1/${encodeURIComponent(lockName)}/unlock-member`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-btcpay-api-key': apiKey
          },
          body: JSON.stringify({ invoiceId })
        })
        
        if (!response.ok) {
          const error = await response.json()
          if (error.error === 'Valid membership required') {
            toast.error('Valid membership required to unlock')
            toast.info('Please ensure you have a paid membership invoice within the last 30 days')
          } else if (error.details?.result?.bridge_server_status_text === 'BridgeBusy') {
            toast.error('Bridge is busy. Please try again in a few seconds.')
          } else {
            toast.error(error.error || 'Failed to unlock')
          }
          return
        }

        const result = await response.json()
        
        if (result.success) {
          toast.success('Lock unlocked successfully with valid membership')
          toast.info('Switch to Status tab to check the new state')
          // Refresh membership info
          await checkMembershipStatus()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to unlock')
      } finally {
        setOperationInProgress(null)
        setApiRequestInProgress(false)
      }
      return
    }

    // Regular operation (lock or non-membership unlock)
    try {
      setApiRequestInProgress(true)
      setOperationInProgress(operation)
      const response = await fetch(`/api/v1/${encodeURIComponent(lockName)}/${operation}`)
      
      if (!response.ok) {
        const error = await response.json()
        if (error.details?.result?.bridge_server_status_text === 'BridgeBusy') {
          toast.error('Bridge is busy. Please try again in a few seconds.')
        } else {
          toast.error(error.error || `Failed to ${operation}`)
        }
        return
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Lock ${operation === 'lock' ? 'locked' : 'unlocked'} successfully`)
        // Don't auto-refresh to avoid bridge busy errors
        toast.info('Switch to Status tab to check the new state')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${operation}`)
    } finally {
      setOperationInProgress(null)
      setApiRequestInProgress(false)
    }
  }

  const getBatteryIcon = (level?: number) => {
    if (level === undefined) return null
    if (level > 75) return '🔋'
    if (level > 50) return '🔋'
    if (level > 25) return '🪫'
    return '🪫'
  }

  const getBatteryColor = (level?: number) => {
    if (level === undefined) return 'text-gray-500'
    if (level > 75) return 'text-green-600'
    if (level > 50) return 'text-yellow-600'
    if (level > 25) return 'text-orange-600'
    return 'text-red-600'
  }

  const handleInvoiceValidated = (invoiceData: any) => {
    // Update membership info with validated invoice
    const expiresAt = new Date(invoiceData.createdTime)
    expiresAt.setDate(expiresAt.getDate() + 30)
    
    setMembershipInfo({
      isValid: true,
      expiresAt: expiresAt.toISOString(),
      invoiceId: invoiceData.invoiceId
    })
    
    toast.success('Membership activated successfully!')
  }

  return (
    <>
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{lockName}</CardTitle>
            <CardDescription>Control and monitor your lock</CardDescription>
          </div>
          {apiRequestInProgress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>Request in progress...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="control">Control</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="battery">Battery</TabsTrigger>
          </TabsList>
          
          <TabsContent value="control" className="space-y-4">
            {/* Membership Mode Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Membership Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Require valid membership for unlock
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={useMembershipUnlock ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseMembershipUnlock(!useMembershipUnlock)}
                >
                  {useMembershipUnlock ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>

            {/* Membership Status */}
            {useMembershipUnlock && (
              <div className="rounded-lg border p-4">
                {loadingState === 'membership' ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : membershipInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {membershipInfo.isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {membershipInfo.isValid ? 'Valid Membership' : 'No Valid Membership'}
                          </p>
                          {membershipInfo.expiresAt && (
                            <p className="text-sm text-muted-foreground">
                              Expires: {new Date(membershipInfo.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                          {membershipInfo.invoiceId && (
                            <p className="text-xs text-muted-foreground">
                              Invoice: {membershipInfo.invoiceId.substring(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowInvoiceScanner(true)}
                          disabled={apiRequestInProgress}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={checkMembershipStatus}
                          disabled={apiRequestInProgress}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center text-sm text-muted-foreground">
                      <p>No valid membership found</p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => setShowInvoiceScanner(true)}
                      disabled={!localStorage.getItem('btcpay_api_key')}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Add Membership Invoice
                    </Button>
                    {!localStorage.getItem('btcpay_api_key') && (
                      <p className="text-xs text-center text-muted-foreground">
                        Configure BTCPay API key in settings first
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 py-8">
              <Button
                size="lg"
                variant={lockState.state === 'Locked' ? 'default' : 'outline'}
                onClick={() => performOperation('lock')}
                disabled={operationInProgress !== null || apiRequestInProgress}
                className="h-24 w-32 flex-col gap-2"
              >
                {operationInProgress === 'lock' ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Lock className="h-8 w-8" />
                )}
                <span>Lock</span>
              </Button>
              
              <Button
                size="lg"
                variant={lockState.state === 'Unlocked' ? 'default' : 'outline'}
                onClick={() => performOperation('unlock')}
                disabled={operationInProgress !== null || apiRequestInProgress || (useMembershipUnlock && membershipInfo !== null && !membershipInfo.isValid)}
                className="h-24 w-32 flex-col gap-2"
              >
                {operationInProgress === 'unlock' ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <LockOpen className="h-8 w-8" />
                )}
                <span>Unlock</span>
              </Button>
            </div>

            {useMembershipUnlock && membershipInfo && !membershipInfo.isValid && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A valid membership is required to unlock this door. Please ensure you have a paid membership invoice within the last 30 days.
                </AlertDescription>
              </Alert>
            )}

            {lockState.is_blocked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This lock is currently blocked and cannot be operated.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLockState}
                disabled={loadingState === 'state' || apiRequestInProgress}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingState === 'state' ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
            </div>

            {loadingState === 'state' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    {lockState.state === 'Locked' ? (
                      <Lock className="h-5 w-5 text-green-600" />
                    ) : (
                      <LockOpen className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">Lock State</p>
                      <p className="text-sm text-muted-foreground">Current lock position</p>
                    </div>
                  </div>
                  <Badge variant={lockState.state === 'Locked' ? 'default' : 'secondary'}>
                    {lockState.state || 'Unknown'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Lock Status</p>
                      <p className="text-sm text-muted-foreground">Operational status</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {lockState.lock_status || 'Unknown'}
                  </Badge>
                </div>

                {lockState.is_blocked && (
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Lock Blocked</p>
                        <p className="text-sm text-red-700">Lock is currently blocked</p>
                      </div>
                    </div>
                    <Badge variant="destructive">Blocked</Badge>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="battery" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBatteryLevel}
                disabled={loadingState === 'battery' || apiRequestInProgress}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingState === 'battery' ? 'animate-spin' : ''}`} />
                Refresh Battery
              </Button>
            </div>

            {loadingState === 'battery' ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Battery className={`h-5 w-5 ${getBatteryColor(batteryInfo.battery_level)}`} />
                  <div>
                    <p className="font-medium">Battery Level</p>
                    <p className="text-sm text-muted-foreground">Remaining battery charge</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${getBatteryColor(batteryInfo.battery_level)}`}>
                    {getBatteryIcon(batteryInfo.battery_level)}
                  </span>
                  <Badge variant={batteryInfo.battery_level && batteryInfo.battery_level > 25 ? 'default' : 'destructive'}>
                    {batteryInfo.battery_level !== undefined ? `${batteryInfo.battery_level}%` : 'Unknown'}
                  </Badge>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    
    {/* Invoice Scanner Dialog */}
    <InvoiceScanner
      open={showInvoiceScanner}
      onOpenChange={setShowInvoiceScanner}
      onInvoiceValidated={handleInvoiceValidated}
      btcpayApiKey={localStorage.getItem('btcpay_api_key') || ''}
      lockName={lockName}
    />
    </>
  )
}