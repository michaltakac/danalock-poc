'use client'

import { useState } from 'react'
import { LockList } from './lock-list'
import { LockControlPanel } from './lock-control-panel'
import { Lock } from '@/lib/danalock-client'
import { Toaster } from '@/components/ui/sonner'

export function LockManager() {
  const [selectedLock, setSelectedLock] = useState<Lock | null>(null)

  return (
    <>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Danalock Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage and control your Danalock smart locks
          </p>
        </div>

        <div className="space-y-8">
          <LockList 
            onSelectLock={setSelectedLock} 
            selectedLockName={selectedLock?.name}
          />
          
          {selectedLock && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <LockControlPanel lockName={selectedLock.name} />
            </div>
          )}
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </>
  )
}