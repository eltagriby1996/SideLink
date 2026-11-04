import { NextRequest, NextResponse } from 'next/server';
import { getRemoteConfig, isIpBlocked } from '@/lib/database/adminStore';

export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  if (isIpBlocked(ip)) {
    return NextResponse.json(
      { error: 'Access denied: your IP has been restricted by administration.' },
      { status: 403 }
    );
  }

  const config = getRemoteConfig();
  return NextResponse.json({
    success: true,
    ...config,
  });
}
