import { NextRequest, NextResponse } from 'next/server';
import { dbInstance } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { udid, deviceName, pairingPlistBase64, appleId } = body;

    if (!udid || typeof udid !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid device UDID.' }, { status: 400 });
    }

    if (!pairingPlistBase64 || typeof pairingPlistBase64 !== 'string') {
      return NextResponse.json({ error: 'Missing pairing plist payload.' }, { status: 400 });
    }

    await dbInstance.refreshFromCloud();
    const db = dbInstance.getDb();

    // Ensure devices map exists
    if (!(db as any).devices) {
      (db as any).devices = {};
    }

    const cleanUdid = udid.trim().toUpperCase();
    (db as any).devices[cleanUdid] = {
      udid: cleanUdid,
      deviceName: (deviceName || 'iPhone').trim(),
      appleId: (appleId || '').trim(),
      pairingPlistBase64: pairingPlistBase64.trim(),
      pairedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    };

    await dbInstance.saveAsync();

    return NextResponse.json({
      success: true,
      message: 'تم حفظ وتفعيل ملف الاقتران للجهاز بنجاح على السحابة!',
      udid: cleanUdid,
      downloadUrl: `/api/mobile/pairing?udid=${cleanUdid}`,
      wireguardUrl: `/api/mobile/wireguard?udid=${cleanUdid}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const udid = searchParams.get('udid');

    if (!udid) {
      return NextResponse.json({ error: 'Missing udid parameter.' }, { status: 400 });
    }

    await dbInstance.refreshFromCloud();
    const db = dbInstance.getDb();
    const cleanUdid = udid.trim().toUpperCase();
    const device = (db as any).devices?.[cleanUdid];

    if (!device || !device.pairingPlistBase64) {
      return NextResponse.json({ error: 'لا يوجد ملف اقتران مسجل لهذا الجهاز.' }, { status: 404 });
    }

    const format = searchParams.get('format') || 'file';

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        udid: device.udid,
        deviceName: device.deviceName,
        appleId: device.appleId,
        pairingPlistBase64: device.pairingPlistBase64,
        pairedAt: device.pairedAt,
      });
    }

    // Return raw .mobiledevicepairing file download
    const plistBuffer = Buffer.from(device.pairingPlistBase64, 'base64');
    return new NextResponse(plistBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': `attachment; filename="${cleanUdid}.mobiledevicepairing"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

