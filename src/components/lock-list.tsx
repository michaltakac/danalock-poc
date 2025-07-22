'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Lock } from '@/lib/danalock-client'
import { Lock as LockIcon, Unlock, AlertCircle } from 'lucide-react'

interface LockListProps {
  onSelectLock: (lock: Lock) => void
  selectedLockName?: string
}

export function LockList({ onSelectLock, selectedLockName }: LockListProps) {
  const [locks, setLocks] = useState<Lock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLocks()
  }, [])

  const fetchLocks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/locks')
      if (!response.ok) {
        throw new Error('Failed to fetch locks')
      }
      const data = await response.json()
      setLocks(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Available Locks</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Available Locks</h2>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Error Loading Locks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchLocks}
              className="mt-4 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Available Locks</h2>
      {locks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No locks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locks.map((lock) => (
            <Card
              key={lock.id}
              className={`cursor-pointer transition-colors hover:border-primary ${
                selectedLockName === lock.name ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelectLock(lock)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LockIcon className="h-5 w-5" />
                    {lock.name}
                  </span>
                  {selectedLockName === lock.name && (
                    <Badge variant="secondary">Selected</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {lock.afi?.device_type || lock.type}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    ID: <span className="font-mono">{lock.id}</span>
                  </p>
                  {lock.afi?.serial_number && (
                    <p className="text-muted-foreground">
                      Serial: <span className="font-mono">{lock.afi.serial_number}</span>
                    </p>
                  )}
                  {lock.timezone && (
                    <p className="text-muted-foreground">
                      Timezone: {lock.timezone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}