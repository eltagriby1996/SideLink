import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import { getBlacklist, addBlacklistIp, removeBlacklistIp } from '@/lib/database/adminStore';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const list = getBlacklist();
  return NextResponse.json({ success: true, blacklist: list });
}

export async function POST(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { ip, reason } = body;

    if (!ip) {
      return NextResponse.json({ error: 'عنوان IP مطلوب.' }, { status: 400 });
    }

    const item = addBlacklistIp(ip, reason || 'حظر من الآدمن');
    return NextResponse.json({ success: true, item, message: `تم حظر العنوان ${ip} بنجاح.` });
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
  const ip = searchParams.get('ip');

  if (!ip) {
    return NextResponse.json({ error: 'Missing ip parameter' }, { status: 400 });
  }

  const ok = removeBlacklistIp(ip);
  return NextResponse.json({ success: ok, message: ok ? `تم إلغاء حظر ${ip}.` : 'العنوان غير موجود في القائمة.' });
}
