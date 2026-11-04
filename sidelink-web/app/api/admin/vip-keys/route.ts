import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import { getVipKeys, generateVipKey, revokeVipKey, deleteVipKey } from '@/lib/database/adminStore';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = getVipKeys();
  return NextResponse.json({ success: true, keys });
}

export async function POST(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const key = generateVipKey({
      note: body.note || 'مفتاح ترخيص من لوحة التحكم',
      expiresInDays: body.expiresInDays !== undefined ? Number(body.expiresInDays) : null,
      maxUses: body.maxUses !== undefined ? Number(body.maxUses) : 0,
    });

    return NextResponse.json({ success: true, key, message: 'تم إنشاء مفتاح VIP جديد بنجاح.' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const action = searchParams.get('action') || 'delete';

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  if (action === 'revoke') {
    const ok = revokeVipKey(key);
    return NextResponse.json({ success: ok, message: ok ? 'تم تعطيل المفتاح.' : 'المفتاح غير موجود.' });
  }

  const ok = deleteVipKey(key);
  return NextResponse.json({ success: ok, message: ok ? 'تم مسح المفتاح نهائياً.' : 'المفتاح غير موجود.' });
}

