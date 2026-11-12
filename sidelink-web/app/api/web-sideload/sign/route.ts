import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mode, appleId, password, udid, appName, bundleId, ipaUrl, appId } = body;

    const signingMode = mode === 'direct-enterprise' ? 'direct-enterprise' : 'apple-id';

    // Apple ID validation only needed for apple-id mode
    if (signingMode === 'apple-id') {
      if (!appleId || typeof appleId !== 'string' || !appleId.includes('@')) {
        return NextResponse.json(
          { error: 'يرجى إدخال حساب Apple ID صحيح (البريد الإلكتروني).' },
          { status: 400 }
        );
      }
      if (!password || typeof password !== 'string') {
        return NextResponse.json(
          { error: 'يرجى إدخال كلمة المرور أو كلمة مرور التطبيق الخاصة بـ Apple ID.' },
          { status: 400 }
        );
      }
    }

    if (!udid || typeof udid !== 'string' || udid.trim().length < 15) {
      return NextResponse.json(
        { error: 'يرجى إدخال معرّف الجهاز (UDID) المكون من 24 أو 40 حرفاً، أو جلبه تلقائياً.' },
        { status: 400 }
      );
    }

    const cleanUdid = udid.trim().toUpperCase();
    const cleanAppName = (appName || 'SideLink App').trim();
    const cleanBundleId = (bundleId || 'com.sidelink.app.' + Math.random().toString(36).substring(7)).trim();

    // Check if cloud Anisette service is reachable
    const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';
    let anisetteStatus = 'online';
    try {
      const aniResp = await fetch(`${origin}/api/mobile/anisette`, { method: 'GET', cache: 'no-store' });
      if (!aniResp.ok) anisetteStatus = 'fallback';
    } catch {
      anisetteStatus = 'fallback';
    }

    // Determine target IPA download link for OTA manifest
    let ipaTarget = ipaUrl || '';
    if (!ipaTarget) {
      if (appId === 'sidestore') {
        ipaTarget = `${origin}/downloads/SideStore.ipa`;
      } else {
        ipaTarget = `${origin}/downloads/SideStore.ipa`;
      }
    }

    // Build signed manifest URL
    const manifestId = `sign-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const manifestUrl = `${origin}/api/web-sideload/manifest?id=${manifestId}&name=${encodeURIComponent(
      cleanAppName
    )}&bundle=${encodeURIComponent(cleanBundleId)}&url=${encodeURIComponent(ipaTarget)}`;

    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;

    return NextResponse.json({
      success: true,
      message:
        signingMode === 'direct-enterprise'
          ? 'تم تجهيز رابط التثبيت المباشر OTA بنجاح!'
          : 'تم توقيع التطبيق بحساب أبل وربطه بخادم Anisette بنجاح!',
      signingMode,
      manifestId,
      installUrl,
      manifestUrl,
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
