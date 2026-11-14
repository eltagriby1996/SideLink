import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SideLink@2026';
const SECRET_KEY = process.env.TOKEN_SIGNING_PRIVATE_KEY || 'SideLink-Secure-Verification-MasterKey-2026-X89!';
const COOKIE_NAME = 'sidelink_admin_session';

function getSecretBytes(): Uint8Array {
  return new TextEncoder().encode(SECRET_KEY);
}

export function checkAdminPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === ADMIN_PASSWORD.trim();
}

export async function createAdminSessionToken(): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days session
  const secret = getSecretBytes();

  const token = await new SignJWT({
    role: 'super-admin',
    scope: 'admin-dashboard',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('SideLink-admin')
    .setSubject('admin')
    .setExpirationTime('7d')
    .sign(secret);

  return { token, expiresAt };
}

export async function isAuthorizedAdmin(request?: NextRequest): Promise<boolean> {
  if (!request) return false;

  // 1. Check direct password header
  const headerPassword = request.headers.get('x-admin-password');
  if (headerPassword && checkAdminPassword(headerPassword)) {
    return true;
  }

  // 2. Check HTTP-Only Session Cookie
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    const isValid = await verifyToken(cookieToken);
    if (isValid) return true;
  }

  // 3. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    const isValid = await verifyToken(bearerToken);
    if (isValid) return true;
  }

  return false;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = getSecretBytes();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'SideLink-admin',
    });
    return payload.role === 'super-admin';
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
