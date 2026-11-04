import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import { getAllSessions } from '@/lib/database/sessionStore';
import { getAdminStats } from '@/lib/database/adminStore';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await getAllSessions();
  const stats = getAdminStats(sessions);

  return NextResponse.json({ success: true, stats });
}
