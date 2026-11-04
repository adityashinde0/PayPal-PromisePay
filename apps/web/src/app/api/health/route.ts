import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'promisepay-web',
    timestamp: new Date().toISOString(),
  });
}

