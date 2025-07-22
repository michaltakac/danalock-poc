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
    
    const batteryResponse = await client.getBatteryLevel(serialNumber);
    
    if (batteryResponse.status !== 'Succeeded') {
      console.error('Failed to get battery level:', batteryResponse);
      return NextResponse.json(
        { error: 'Failed to get battery level', details: batteryResponse },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      lock_name: lockName,
      battery_level: batteryResponse.result?.battery_level,
      afi_status: batteryResponse.result?.afi_status,
      afi_status_text: batteryResponse.result?.afi_status_text
    });
  } catch (error) {
    console.error('Error getting battery level:', error);
    
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
      { error: 'Failed to get battery level' },
      { status: 500 }
    );
  }
}