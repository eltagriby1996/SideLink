import { SignJWT, jwtVerify } from 'jose';

const ISSUER = process.env.TOKEN_ISSUER || 'SideLink-verification';
const AUDIENCE = process.env.TOKEN_AUDIENCE || 'SideLink-client';
// Use configured secret or standard default key for HMAC-SHA256 signing
const SECRET_KEY = process.env.TOKEN_SIGNING_PRIVATE_KEY || 'SideLink-Secure-Verification-MasterKey-2026-X89!';

function getSecretBytes(): Uint8Array {
  return new TextEncoder().encode(SECRET_KEY);
}

export async function createAuthorizationToken(sessionId: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
  const secret = getSecretBytes();

  const token = await new SignJWT({
    sessionId,
    purpose: 'SideLink-session-unlock',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(sessionId)
    .setExpirationTime('5m')
    .sign(secret);

  return { token, expiresAt };
}

export async function verifyAuthorizationToken(token: string, expectedSessionId: string): Promise<boolean> {
  try {
    const secret = getSecretBytes();
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    return payload.sub === expectedSessionId || payload.sessionId === expectedSessionId;
  } catch (error) {
    return false;
  }
}

export { ISSUER, AUDIENCE, SECRET_KEY };
