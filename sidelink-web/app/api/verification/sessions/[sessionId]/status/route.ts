import { NextRequest, NextResponse } from 'next/server';
import { getSessionRecord } from '@/lib/database/sessionStore';
import { dbInstance } from '@/lib/database/db';

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

    const db = dbInstance.getDb();
    const config = db.config;

    if (config?.emergencyKillSwitch) {
      const res = NextResponse.json({
        sessionId,
        status: 'expired',
        killSwitch: true,
        reason: config.killSwitchMessage || 'تطبيق SideLink متوقف مؤقتاً لأعمال الصيانة والتطوير الأمني.',
      });
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    if (config && !config.isVerificationEnabled) {
      const res = NextResponse.json({
        sessionId,
        status: 'verified',
        isVerificationEnabled: false,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    const session = await getSessionRecord(sessionId);
    if (!session) {
      const res = NextResponse.json({
        sessionId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    const res = NextResponse.json({
      sessionId: session.sessionId,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
    });
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}
