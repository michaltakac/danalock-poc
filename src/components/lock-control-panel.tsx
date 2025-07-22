'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, LockOpen, Battery, RefreshCw, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

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

export function LockControlPanel({ lockName }: LockControlPanelProps) {
  const [lockState, setLockState] = useState<LockState>({})
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({})
  const [loadingState, setLoadingState] = useState<'state' | 'battery' | null>(null)
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('control')
  const [apiRequestInProgress, setApiRequestInProgress] = useState(false)

  useEffect(() => {
    // Only fetch data when tab changes to avoid simultaneous requests
    if (activeTab === 'status') {
      fetchLockState()
    } else if (activeTab === 'battery') {
      fetchBatteryLevel()
    }
  }, [activeTab, lockName])

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

  const performOperation = async (operation: 'lock' | 'unlock') => {
    if (apiRequestInProgress) {
      toast.warning('Another request is in progress. Please wait.')
      return
    }

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

  return (
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
            <div className="flex items-center justify-center gap-4 py-8">
              <Button
                size="lg"
                variant={lockState.state === 'Locked' ? 'default' : 'outline'}
                onClick={() => performOperation('lock')}
                disabled={operationInProgress !== null}
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
                disabled={operationInProgress !== null}
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
  )
}