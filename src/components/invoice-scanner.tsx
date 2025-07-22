'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Camera, Keyboard, Loader2, CheckCircle, AlertCircle, QrCode } from 'lucide-react'
import { toast } from 'sonner'

interface InvoiceScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvoiceValidated: (invoiceData: InvoiceData) => void
  btcpayApiKey: string
  lockName: string
}

interface InvoiceData {
  invoiceId: string
  createdTime: string
  status: string
  amount: number
  currency: string
  metadata?: Record<string, any>
}

export function InvoiceScanner({ 
  open, 
  onOpenChange, 
  onInvoiceValidated,
  btcpayApiKey,
  lockName
}: InvoiceScannerProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('manual')
  const [invoiceId, setInvoiceId] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (activeTab === 'scan' && open) {
      startScanning()
    } else {
      stopScanning()
    }
    
    return () => {
      stopScanning()
    }
  }, [activeTab, open])

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsScanning(true)
      
      // Note: In a real implementation, you would integrate a QR code scanning library
      // like qr-scanner or zxing-js here to process the video stream
      toast.info('QR scanning requires additional setup. Please use manual entry for now.')
    } catch (err) {
      console.error('Failed to start camera:', err)
      toast.error('Failed to access camera. Please use manual entry.')
      setActiveTab('manual')
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const validateInvoice = async () => {
    if (!invoiceId.trim()) {
      setError('Please enter an invoice ID')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      // Call the API to validate the invoice
      const response = await fetch('/api/v1/membership/validate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-btcpay-api-key': btcpayApiKey
        },
        body: JSON.stringify({ invoiceId: invoiceId.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to validate invoice')
      }

      const data = await response.json()
      
      if (!data.isValid) {
        throw new Error(data.message || 'Invalid membership invoice')
      }

      // Store in localStorage
      const membershipData = {
        invoiceId: data.invoice.id,
        createdTime: data.invoice.createdTime,
        expiresAt: data.expiresAt,
        validatedAt: new Date().toISOString()
      }
      
      localStorage.setItem('ppke_membership', JSON.stringify(membershipData))
      
      toast.success('Membership validated successfully!')
      onInvoiceValidated(data.invoice)
      onOpenChange(false)
    } catch (err) {
      console.error('Invoice validation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to validate invoice')
    } finally {
      setIsValidating(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateInvoice()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Membership Verification</DialogTitle>
          <DialogDescription>
            Scan your membership invoice QR code or enter the invoice ID manually
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'scan' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-4">
            <div className="space-y-4">
              {isScanning ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-lg border-2 border-white/50">
                      <QrCode className="h-full w-full text-white/20" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Position the QR code within the frame. The scanner will automatically detect and validate your membership invoice.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceId">Invoice ID</Label>
                <Input
                  id="invoiceId"
                  placeholder="Enter your invoice ID"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  disabled={isValidating}
                />
                <p className="text-sm text-muted-foreground">
                  You can find this on your BTCPay invoice or payment receipt
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isValidating || !invoiceId.trim()}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Validate Membership
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}