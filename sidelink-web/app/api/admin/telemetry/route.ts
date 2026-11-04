import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import { getTelemetryEvents, clearTelemetryEvents } from '@/lib/database/adminStore';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit')) || 150;

  const events = getTelemetryEvents(limit);
  return NextResponse.json({ success: true, events });
}

export async function DELETE(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  clearTelemetryEvents();
  return NextResponse.json({ success: true, message: 'تم مسح سجلات الـ Telemetry بنجاح.' });
}

