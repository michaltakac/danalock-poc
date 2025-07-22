import { NextResponse } from 'next/server';
import { getDanalockClient, getLockSerialNumber } from '@/lib/lock-helper';
import { validateConfig } from '@/lib/config';
import { BTCPayClient } from '@/services/btcpay-client';
import { clientEnv } from '@/lib/env';

export async function POST(
  request: Request,
  { params }: { params: { lockName: string } }
) {
  try {
    validateConfig();
    
    const lockName = await params.lockName;
    
    // Get BTCPay API key from request header
    const btcpayApiKey = request.headers.get('x-btcpay-api-key');
    
    if (!btcpayApiKey) {
      return NextResponse.json(
        { error: 'BTCPay API key required' },
        { status: 401 }
      );
    }

    // Initialize BTCPay client
    const btcPayClient = new BTCPayClient({
      serverUrl: clientEnv.btcpayUrl,
      apiKey: btcpayApiKey,
      storeId: clientEnv.storeId,
    });

    // Get invoice ID from request body if provided
    const body = await request.json().catch(() => ({}));
    const { invoiceId } = body;

    let membershipValid = false;
    let membershipData: any = null;

    // If invoice ID is provided, verify it directly
    if (invoiceId) {
      try {
        const invoice = await btcPayClient.getInvoiceById(invoiceId);
        const isPaid = invoice.status === 'Settled' || invoice.status === 'Complete';
        const createdDate = new Date(invoice.createdTime * 1000);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (isPaid && createdDate >= thirtyDaysAgo) {
          membershipValid = true;
          const expiresAt = new Date(createdDate);
          expiresAt.setDate(expiresAt.getDate() + 30);
          
          membershipData = {
            valid: true,
            invoiceId: invoice.id,
            expiresAt: expiresAt.toISOString()
          };
        }
      } catch (error) {
        console.error('Failed to verify specific invoice:', error);
      }
    }

    // If no valid membership from specific invoice, check general membership status
    if (!membershipValid) {
      const membershipStatus = await btcPayClient.checkMembershipStatus({
        type: 'membership' // You can customize this metadata filter
      });

      if (!membershipStatus.isValid) {
        return NextResponse.json(
          { 
            error: 'Valid membership required',
            message: 'No valid membership invoice found',
            membershipStatus: {
              isValid: false,
              invoiceCount: membershipStatus.invoiceCount
            }
          },
          { status: 403 }
        );
      }

      membershipData = {
        valid: true,
        invoiceId: membershipStatus.mostRecentInvoice?.id,
        expiresAt: membershipStatus.expiresAt
      };
    }

    // Membership is valid, proceed with unlock
    const client = getDanalockClient();
    const serialNumber = await getLockSerialNumber(lockName);
    
    const operateResponse = await client.operateLock(serialNumber, 'unlock');
    
    if (operateResponse.status !== 'Succeeded') {
      return NextResponse.json(
        { error: 'Failed to unlock', details: operateResponse },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      lock_name: lockName,
      operation: 'unlock',
      afi_status: operateResponse.result?.afi_status,
      afi_status_text: operateResponse.result?.afi_status_text,
      membership: {
        valid: true,
        invoiceId: membershipStatus.mostRecentInvoice?.id,
        expiresAt: membershipStatus.expiresAt
      }
    });
  } catch (error) {
    console.error('Error unlocking with membership check:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          { error: 'Invalid configuration' },
          { status: 500 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Bridge communication timeout' },
          { status: 504 }
        );
      }
      if (error.message.includes('BTCPay')) {
        return NextResponse.json(
          { error: 'Failed to verify membership', details: error.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to unlock' },
      { status: 500 }
    );
  }
}

// Also create a GET endpoint to check membership status without unlocking
export async function GET(
  request: Request,
  { params }: { params: { lockName: string } }
) {
  try {
    const btcpayApiKey = request.headers.get('x-btcpay-api-key');
    
    if (!btcpayApiKey) {
      return NextResponse.json(
        { error: 'BTCPay API key required' },
        { status: 401 }
      );
    }

    // Initialize BTCPay client
    const btcPayClient = new BTCPayClient({
      serverUrl: clientEnv.btcpayUrl,
      apiKey: btcpayApiKey,
      storeId: clientEnv.storeId,
    });

    // Check membership status
    const membershipStatus = await btcPayClient.checkMembershipStatus({
      type: 'membership' // You can customize this metadata filter
    });

    return NextResponse.json({
      lockName: await params.lockName,
      membership: {
        isValid: membershipStatus.isValid,
        invoiceCount: membershipStatus.invoiceCount,
        mostRecentInvoice: membershipStatus.mostRecentInvoice,
        expiresAt: membershipStatus.expiresAt
      }
    });
  } catch (error) {
    console.error('Error checking membership status:', error);
    
    return NextResponse.json(
      { error: 'Failed to check membership status' },
      { status: 500 }
    );
  }
}