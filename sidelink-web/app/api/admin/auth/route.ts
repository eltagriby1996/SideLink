import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, createAdminSessionToken, isAuthorizedAdmin } from '@/lib/security/adminAuth';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, role: 'super-admin' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body.password;

    if (!password || !checkAdminPassword(password)) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة.' }, { status: 401 });
    }

    const { token, expiresAt } = await createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      token,
      expiresAt: expiresAt.toISOString(),
    });

    // Set HTTP-Only Cookie for seamless browser navigation
    response.cookies.set('sidelink_admin_token', token, {
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
  response.cookies.set('sidelink_admin_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}
