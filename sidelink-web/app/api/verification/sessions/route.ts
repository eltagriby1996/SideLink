import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createSessionRecord } from '@/lib/database/sessionStore';

export async function POST(request: NextRequest) {
  try {
    const sessionId = uuidv4();
    const challengeNonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    await createSessionRecord(sessionId, expiresAt, challengeNonce, ip);

    const baseUrl = process.env.VERIFICATION_BASE_URL || request.nextUrl.origin;
    const verificationUrl = `${baseUrl}/verify?session=${sessionId}&nonce=${challengeNonce}`;

    return NextResponse.json(
      {
        sessionId,
        verificationUrl,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create verification session' },
      { status: 500 }
    );
  }
}
