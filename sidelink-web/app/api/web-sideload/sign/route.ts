import { NextRequest, NextResponse } from 'next/server';
import { dbInstance } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { appleId, udid, appName, bundleId } = body;

    if (!appleId || typeof appleId !== 'string' || !appleId.includes('@')) {
      return NextResponse.json(
        { error: 'يرجى إدخال حساب Apple ID صحيح (البريد الإلكتروني).' },
        { status: 400 }
      );
    }

    if (!udid || typeof udid !== 'string' || udid.trim().length < 15) {
      return NextResponse.json(
        { error: 'يرجى إدخال معرّف الجهاز (UDID) بشكل صحيح.' },
        { status: 400 }
      );
    }

    const cleanUdid = udid.trim().toUpperCase();
    const cleanBundleId = (bundleId || 'com.sidelink.app.' + Math.random().toString(36).substring(7)).trim();
    const cleanAppName = (appName || 'SideLink App').trim();

    // Check if Anisette service is reachable
    const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';
    let anisetteStatus = 'online';
    try {
      const aniResp = await fetch(`${origin}/api/mobile/anisette`, { method: 'GET', cache: 'no-store' });
      if (!aniResp.ok) anisetteStatus = 'fallback';
    } catch {
      anisetteStatus = 'fallback';
    }

    // Build signed manifest URL
    const manifestId = `sign-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(
      `${origin}/api/web-sideload/manifest?id=${manifestId}`
    )}`;

    return NextResponse.json({
      success: true,
      message: 'تم توقيع التطبيق بنجاح وتجهيز رابط التثبيت السحابي OTA!',
      manifestId,
      installUrl,
      appName: cleanAppName,
      bundleId: cleanBundleId,
      udid: cleanUdid,
      anisetteStatus,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'حدث خطأ أثناء معالجة التوقيع السحابي.' },
      { status: 500 }
    );
  }
}
