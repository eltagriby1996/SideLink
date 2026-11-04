import { NextRequest, NextResponse } from 'next/server';
import { recordTelemetryEvent, isIpBlocked } from '@/lib/database/adminStore';

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (isIpBlocked(clientIp)) {
      return NextResponse.json({ error: 'Blocked' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { clientVersion, deviceModel, iosVersion, action, status, errorCode, errorMessage } = body;

    if (!action || !status) {
      return NextResponse.json({ error: 'Invalid telemetry payload' }, { status: 400 });
    }

    const recorded = recordTelemetryEvent({
      clientVersion: clientVersion || '1.0.0',
      deviceModel: deviceModel || 'Unknown Device',
      iosVersion: iosVersion || 'iOS Unknown',
      action: action,
      status: status === 'error' ? 'error' : 'success',
      errorCode,
      errorMessage,
      clientIp,
    });

    return NextResponse.json({ success: true, id: recorded.id });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record telemetry' }, { status: 500 });
  }
}

