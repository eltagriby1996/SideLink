import { NextRequest, NextResponse } from 'next/server';
import { getSessionRecord } from '@/lib/database/sessionStore';
import { createAuthorizationToken } from '@/lib/security/tokenService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const session = await getSessionRecord(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'verified') {
      return NextResponse.json(
        { error: `Session is not verified (current status: ${session.status})` },
        { status: 403 }
      );
    }

    if (new Date() >= session.expiresAt) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 410 });
    }

    const { token, expiresAt } = await createAuthorizationToken(sessionId);

    return NextResponse.json({
      sessionId,
      token,
      expiresAt: expiresAt.toISOString(),
      tokenType: 'Bearer',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
