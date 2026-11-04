import { NextRequest, NextResponse } from 'next/server';
import { markSessionVerified } from '@/lib/database/sessionStore';

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
      return NextResponse.json({ error: result.error || 'Verification failed' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      status: 'verified',
      message: 'Verification complete. You may now return to SideLink.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
