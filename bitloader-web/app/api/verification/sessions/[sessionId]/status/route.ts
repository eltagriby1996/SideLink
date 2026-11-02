import { NextRequest, NextResponse } from 'next/server';
import { getSessionRecord } from '@/lib/database/sessionStore';

export async function GET(
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
      return NextResponse.json({ error: 'Session not found', status: 'expired' }, { status: 404 });
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
