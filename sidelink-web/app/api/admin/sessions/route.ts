import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import {
  getAllSessions,
  revokeSession,
  manuallyVerifySession,
  deleteSession,
  cleanupExpiredSessions,
} from '@/lib/database/sessionStore';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await getAllSessions();
  return NextResponse.json({ success: true, sessions });
}

export async function POST(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action, sessionId } = body;

    if (action === 'cleanup') {
      const count = await cleanupExpiredSessions();
      return NextResponse.json({ success: true, message: `تم حذف ${count} جلسة منتهية.` });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (action === 'revoke') {
      const ok = await revokeSession(sessionId);
      return NextResponse.json({ success: ok, message: ok ? 'تم إلغاء الجلسة بنجاح.' : 'الجلسة غير موجودة.' });
    }

    if (action === 'verify') {
      const ok = await manuallyVerifySession(sessionId);
      return NextResponse.json({ success: ok, message: ok ? 'تم تأكيد الجلسة يدوياً.' : 'تعذر تأكيد الجلسة.' });
    }

    if (action === 'delete') {
      const ok = await deleteSession(sessionId);
      return NextResponse.json({ success: ok, message: ok ? 'تم مسح الجلسة.' : 'الجلسة غير موجودة.' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

