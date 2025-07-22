import { NextResponse } from 'next/server';
import { getDanalockClient, getLockSerialNumber } from '@/lib/lock-helper';
import { validateConfig } from '@/lib/config';

export async function GET(
  request: Request,
  { params }: { params: { lockName: string } }
) {
  try {
    validateConfig();
    
    const lockName = await params.lockName;
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
      afi_status_text: operateResponse.result?.afi_status_text
    });
  } catch (error) {
    console.error('Error unlocking:', error);
    
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
    }
    
    return NextResponse.json(
      { error: 'Failed to unlock' },
      { status: 500 }
    );
  }
}