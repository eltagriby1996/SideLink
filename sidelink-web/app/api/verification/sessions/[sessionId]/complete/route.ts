import { NextRequest, NextResponse } from 'next/server';
import { markSessionVerified } from '@/lib/database/sessionStore';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const nonce = typeof body?.nonce === 'string' ? body.nonce : '';

    const result = await markSessionVerified(sessionId, nonce);
    if (!result.success) {
      const errRes = NextResponse.json({ error: result.error || 'Verification failed' }, { status: 400 });
      errRes.headers.set('Access-Control-Allow-Origin', '*');
      return errRes;
    }

    const res = NextResponse.json({
      success: true,
      sessionId,
      status: 'verified',
      message: 'Verification complete. You may now return to SideLink.',
    });
    res.headers.set('Access-Control-Allow-Origin', '*');
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
