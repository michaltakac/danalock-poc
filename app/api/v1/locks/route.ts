import { NextResponse } from 'next/server';
import { getDanalockClient } from '@/lib/lock-helper';
import { validateConfig } from '@/lib/config';

export async function GET() {
  try {
    validateConfig();
    
    const client = getDanalockClient();
    const locks = await client.getLocks();
    
    return NextResponse.json(locks);
  } catch (error) {
    console.error('Error fetching locks:', error);
    
    if (error instanceof Error && error.message.includes('credentials')) {
      return NextResponse.json(
        { error: 'Invalid configuration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch locks' },
      { status: 500 }
    );
  }
}