import { NextResponse } from 'next/server';
import { BTCPayClient } from '@/services/btcpay-client';
import { clientEnv } from '@/lib/env';

export async function POST(request: Request) {
  try {
    const btcpayApiKey = request.headers.get('x-btcpay-api-key');
    
    if (!btcpayApiKey) {
      return NextResponse.json(
        { error: 'BTCPay API key required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Initialize BTCPay client
    const btcPayClient = new BTCPayClient({
      serverUrl: clientEnv.btcpayUrl,
      apiKey: btcpayApiKey,
      storeId: clientEnv.storeId,
    });

    // Get invoice details
    let invoice;
    try {
      invoice = await btcPayClient.getInvoiceById(invoiceId);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check if invoice is paid
    const isPaid = invoice.status === 'Settled' || invoice.status === 'Complete';
    
    if (!isPaid) {
      return NextResponse.json({
        isValid: false,
        message: 'Invoice is not paid',
        invoice: {
          id: invoice.id,
          status: invoice.status,
          createdTime: new Date(invoice.createdTime * 1000).toISOString(),
        }
      });
    }

    // Check if invoice is within 30 days
    const createdDate = new Date(invoice.createdTime * 1000);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (createdDate < thirtyDaysAgo) {
      return NextResponse.json({
        isValid: false,
        message: 'Invoice is older than 30 days',
        invoice: {
          id: invoice.id,
          status: invoice.status,
          createdTime: createdDate.toISOString(),
          amount: invoice.amount,
          currency: invoice.currency,
        }
      });
    }

    // Calculate expiration date (30 days from invoice creation)
    const expiresAt = new Date(createdDate);
    expiresAt.setDate(expiresAt.getDate() + 30);

    return NextResponse.json({
      isValid: true,
      message: 'Valid membership invoice',
      invoice: {
        id: invoice.id,
        status: invoice.status,
        createdTime: createdDate.toISOString(),
        amount: invoice.amount,
        currency: invoice.currency,
        metadata: invoice.metadata,
      },
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Error validating invoice:', error);
    
    return NextResponse.json(
      { error: 'Failed to validate invoice' },
      { status: 500 }
    );
  }
}