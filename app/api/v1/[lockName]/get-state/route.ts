import { NextResponse } from 'next/server';
import { getDanalockClient, getLockSerialNumber } from '@/lib/lock-helper';
import { validateConfig } from '@/lib/config';

export async function GET(
  request: Request,
  { params }: { params: { lockName: string } }
) {
  try {
    validateConfig();
    
    const { lockName } = await params;
    const client = getDanalockClient();
    const serialNumber = await getLockSerialNumber(lockName);
    
    const stateResponse = await client.getLockState(serialNumber);
    
    if (stateResponse.status !== 'Succeeded') {
      return NextResponse.json(
        { error: 'Failed to get lock state', details: stateResponse },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      lock_name: lockName,
      state: stateResponse.result?.state,
      lock_status: stateResponse.result?.lock_status,
      is_blocked: stateResponse.result?.is_blocked,
      afi_status: stateResponse.result?.afi_status,
      afi_status_text: stateResponse.result?.afi_status_text
    });
  } catch (error) {
    console.error('Error getting lock state:', error);
    
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
      { error: 'Failed to get lock state' },
      { status: 500 }
    );
  }
}