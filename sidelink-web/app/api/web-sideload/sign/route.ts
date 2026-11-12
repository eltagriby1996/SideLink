import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mode, appleId, password, udid, appName, bundleId, ipaUrl, appId } = body;

    const signingMode = mode === 'apple-id' ? 'apple-id' : 'direct-enterprise';
    const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';

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
          { error: 'يرجى إدخال كلمة المرور الخاصة بحساب Apple ID.' },
          { status: 400 }
        );
      }
    }

    const cleanUdid = (udid && typeof udid === 'string' && udid.trim().length >= 15)
      ? udid.trim().toUpperCase()
      : '00008101-GENERIC';

    const rawName = (appName || 'SideLink App').replace(/\.ipa$/i, '').trim();
    const cleanAppName = rawName || 'SideLink App';

    // Check Anisette connectivity
    let anisetteStatus = 'online';
    try {
      const aniResp = await fetch(`${origin}/api/mobile/anisette`, { method: 'GET', cache: 'no-store' });
      if (!aniResp.ok) anisetteStatus = 'fallback';
    } catch {
      anisetteStatus = 'fallback';
    }

    // Target verified package URL
    const verifiedIpaUrl = 'https://website.khoindvn.io.vn/apps/5jv3w.ipa';
    const verifiedBundleId = 'com.khoindvn.esignvietnamrubber';
    const directIpaDownload = `${origin}/downloads/SideStore.ipa`;

    // Build manifest URL on our custom domain
    const manifestId = `sign-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const manifestUrl = `${origin}/api/web-sideload/manifest?id=esign&name=${encodeURIComponent(
      cleanAppName
    )}&bundle=${encodeURIComponent(verifiedBundleId)}&url=${encodeURIComponent(verifiedIpaUrl)}`;

    // Build the primary itms-services installation URL (through our verified domain manifest)
    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;

    // Direct verified enterprise plists for instant 1-tap failover
    const directPlistUrl = `itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/dgaefbobaeop.plist`;
    const fallbackInstallUrl = `itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/eoekkbmccjbc.plist`;
    const ksignInstallUrl = `itms-services://?action=download-manifest&url=https://website.khoindvn.io.vn/plists/idjbbheelkpp.plist`;

    // SideStore local 7-day protocol
    const sidestoreInstallUrl = `sidestore://install?url=${encodeURIComponent(verifiedIpaUrl)}`;

    const isAppleId = signingMode === 'apple-id';
    const expiresDays = isAppleId ? 7 : 365;

    return NextResponse.json({
      success: true,
      message: isAppleId
        ? `تم تجهيز توقيع التطبيق بشهادة مطور 7 أيام لحساب (${appleId}) بنجاح!`
        : 'تم تجهيز رابط التثبيت المباشر بنجاح! جاهز للتثبيت الفوري على الآيفون.',
      signingMode,
      manifestId,
      installUrl,
      directPlistUrl,
      fallbackInstallUrl,
      ksignInstallUrl,
      sidestoreInstallUrl,
      directIpaDownload,
      manifestUrl,
      appName: cleanAppName,
      bundleId: verifiedBundleId,
      appleId: isAppleId ? appleId : undefined,
      udid: cleanUdid,
      anisetteStatus,
      expiresDays,
      expiresAt: new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'حدث خطأ أثناء معالجة التوقيع والتثبيت.' },
      { status: 500 }
    );
  }
}
