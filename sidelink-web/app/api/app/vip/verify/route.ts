import { NextRequest, NextResponse } from 'next/server';
import { validateVipKey } from '@/lib/database/adminStore';
import { createAuthorizationToken } from '@/lib/security/tokenService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const key = body.key;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'يرجى إدخال مفتاح الـ VIP.' }, { status: 400 });
    }

    const check = await validateVipKey(key);
    if (!check.isValid) {
      return NextResponse.json({ error: check.reason || 'المفتاح غير صالح.' }, { status: 400 });
    }

    // Issue cryptographic authorization token
    const vipSessionId = `vip-${Date.now()}`;
    const { token, expiresAt } = await createAuthorizationToken(vipSessionId);

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل ترخيص الـ VIP وفك قفل البرنامج بنجاح!',
      token,
      expiresAt: expiresAt.toISOString(),
      isVip: true,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

