import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import { getVipKeys, generateVipKey, revokeVipKey, activateVipKey, deleteVipKey, resetVipKeyHwid } from '@/lib/database/adminStore';
import { dbInstance } from '@/lib/database/db';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbInstance.refreshFromCloud();
  const keys = getVipKeys();
  return NextResponse.json({ success: true, keys });
}

export async function POST(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbInstance.refreshFromCloud();
    const body = await request.json().catch(() => ({}));
    const key = await generateVipKey({
      key: body.key,
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

  if (action === 'reset-hwid') {
    const ok = await resetVipKeyHwid(key);
    return NextResponse.json({
      success: ok,
      message: ok ? 'تم فك ربط الجهاز (HWID) بنجاح. يمكن للمستخدم الآن تفعيله على جهاز جديد.' : 'المفتاح غير موجود.',
    });
  }

  if (action === 'revoke') {
    const ok = await revokeVipKey(key);
    return NextResponse.json({ success: ok, message: ok ? 'تم تعطيل المفتاح.' : 'المفتاح غير موجود.' });
  }

  if (action === 'activate') {
    const ok = await activateVipKey(key);
    return NextResponse.json({ success: ok, message: ok ? 'تم إعادة تفعيل المفتاح بنجاح.' : 'المفتاح غير موجود.' });
  }

  const ok = await deleteVipKey(key);
  return NextResponse.json({ success: ok, message: ok ? 'تم مسح المفتاح نهائياً.' : 'المفتاح غير موجود.' });
}

