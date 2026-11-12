import { NextRequest, NextResponse } from 'next/server';
import { dbInstance } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { udid, apps } = body;

    if (!udid || typeof udid !== 'string') {
      return NextResponse.json({ error: 'Missing device UDID.' }, { status: 400 });
    }

    await dbInstance.refreshFromCloud();
    const db = dbInstance.getDb();

    if (!(db as any).devices) {
      (db as any).devices = {};
    }

    const cleanUdid = udid.trim().toUpperCase();
    const existing = (db as any).devices[cleanUdid] || {
      udid: cleanUdid,
      deviceName: 'iPhone',
      pairedAt: new Date().toISOString(),
    };

    existing.lastSyncAt = new Date().toISOString();
    if (Array.isArray(apps)) {
      existing.installedApps = apps.map((a: any) => ({
        bundleId: String(a.bundleId || ''),
        name: String(a.name || a.appName || 'تطبيق'),
        installedAt: a.installedAt || new Date().toISOString(),
        expiresAt: a.expiresAt || new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
        daysLeft: Math.max(0, Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / (86400 * 1000))),
      }));
    }

    (db as any).devices[cleanUdid] = existing;
    await dbInstance.saveAsync();

    return NextResponse.json({
      success: true,
      message: 'تمت مزامنة حالة التطبيقات مع السحابة بنجاح.',
      device: existing,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const udid = searchParams.get('udid');

    await dbInstance.refreshFromCloud();
    const db = dbInstance.getDb();
    const devices = (db as any).devices || {};

    if (udid) {
      const cleanUdid = udid.trim().toUpperCase();
      const dev = devices[cleanUdid];
      if (!dev) return NextResponse.json({ error: 'الجهاز غير موجود.' }, { status: 404 });
      return NextResponse.json({ success: true, device: dev });
    }

    return NextResponse.json({
      success: true,
      devices: Object.values(devices),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

