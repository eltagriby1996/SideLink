import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, createAdminSessionToken, isAuthorizedAdmin, COOKIE_NAME } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (isAuth) {
    return NextResponse.json({ authenticated: true, role: 'super-admin' });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.' },
        { status: 401 }
      );
    }

    const { token, expiresAt } = await createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      token,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'حدث خطأ في السيرفر أثناء تسجيل الدخول.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
