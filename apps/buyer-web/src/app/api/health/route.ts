import { NextResponse } from 'next/server';

const START_TIME = Date.now();

export async function GET() {
  return NextResponse.json({
    status: 'UP',
    service: 'groupdrive-buyer-web',
    version: '1.0.0',
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  });
}
