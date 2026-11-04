import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@sidelink2026';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'SideLink-Super-Admin-Secret-Key-2026-Auth-XYZ';

function getAdminSecretBytes(): Uint8Array {
  return new TextEncoder().encode(ADMIN_JWT_SECRET);
}

export function checkAdminPassword(password: string): boolean {
  if (!password) return false;
  return password.trim() === ADMIN_PASSWORD;
}

export async function createAdminSessionToken(): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const secret = getAdminSecretBytes();

  const token = await new SignJWT({
    role: 'super-admin',
    issuer: 'SideLink-Admin-Portal',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setSubject('admin')
    .setExpirationTime('7d')
    .sign(secret);

  return { token, expiresAt };
}

export async function isAuthorizedAdmin(request: NextRequest): Promise<boolean> {
  try {
    // 1. Check Bearer token in Authorization header
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Fallback to cookie
    if (!token) {
      token = request.cookies.get('sidelink_admin_token')?.value;
    }

    if (!token) return false;

    const secret = getAdminSecretBytes();
    const { payload } = await jwtVerify(token, secret);

    return payload.role === 'super-admin';
  } catch (err) {
    return false;
  }
}

