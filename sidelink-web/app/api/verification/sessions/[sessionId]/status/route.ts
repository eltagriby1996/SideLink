import { NextRequest, NextResponse } from 'next/server';
import { getSessionRecord } from '@/lib/database/sessionStore';
import { getRemoteConfig } from '@/lib/database/adminStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const config = await getRemoteConfig();
    if (config.emergencyKillSwitch) {
      return NextResponse.json({
        sessionId,
        status: 'expired',
        killSwitch: true,
        reason: config.killSwitchMessage || 'تطبيق SideLink متوقف مؤقتاً لأعمال الصيانة والتطوير الأمني.',
      });
    }

    if (!config.isVerificationEnabled) {
      return NextResponse.json({
        sessionId,
        status: 'verified',
        isVerificationEnabled: false,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
    }

    const session = await getSessionRecord(sessionId);
    if (!session) {
      return NextResponse.json({
        sessionId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
