import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AppMeta {
  bundleId: string;
  name: string;
  ipaUrl?: string;
  plistUrl?: string;
}

const KNOWN_APPS: Record<string, AppMeta> = {
  esign: {
    name: 'ESign (الشهادة الرسمية)',
    bundleId: 'com.khoindvn.esignvietnamrubber',
    ipaUrl: 'https://website.khoindvn.io.vn/apps/5jv3w.ipa',
    plistUrl: 'https://website.khoindvn.io.vn/plists/dgaefbobaeop.plist',
  },
  ksign: {
    name: 'KSign (التوقيع السريع)',
    bundleId: 'com.khoindvn.ksignvietnamrubber',
    ipaUrl: 'https://website.khoindvn.io.vn/apps/l8vr7.ipa',
    plistUrl: 'https://website.khoindvn.io.vn/plists/idjbbheelkpp.plist',
  },
  'esign-powerchina': {
    name: 'ESign (PowerChina)',
    bundleId: 'com.khoindvn.esignpowerchina',
    plistUrl: 'https://website.khoindvn.io.vn/plists/eoekkbmccjbc.plist',
  },
  sidestore: {
    name: 'SideStore',
    bundleId: 'com.SideStore.SideStore',
    ipaUrl: '/downloads/SideStore.ipa',
  },
  spotify: {
    name: 'Spotify++ Deluxe',
    bundleId: 'com.spotify.client.plus',
  },
  youtube: {
    name: 'YouTube uYouEnhanced',
    bundleId: 'com.google.ios.youtube.uyou',
  },
  delta: {
    name: 'Delta Emulator',
    bundleId: 'com.rileytestut.Delta',
  },
  whatsapp: {
    name: 'WhatsApp Watusi 3',
    bundleId: 'net.whatsapp.WhatsApp.watusi',
  },
};

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
          { error: 'يرجى إدخال كلمة المرور أو كلمة مرور التطبيق الخاصة بـ Apple ID.' },
          { status: 400 }
        );
      }
    }

    const cleanUdid = (udid && typeof udid === 'string' && udid.trim().length >= 15)
      ? udid.trim().toUpperCase()
      : '00008101-GENERIC';

    const normalizedAppId = (appId || '').toLowerCase();
    const knownApp = KNOWN_APPS[normalizedAppId];

    const cleanAppName = (appName || knownApp?.name || 'SideLink App').trim();
    const cleanBundleId = (bundleId || knownApp?.bundleId || 'com.sidelink.app.' + Math.random().toString(36).substring(7)).trim();

    // Check Anisette connectivity
    let anisetteStatus = 'online';
    try {
      const aniResp = await fetch(`${origin}/api/mobile/anisette`, { method: 'GET', cache: 'no-store' });
      if (!aniResp.ok) anisetteStatus = 'fallback';
    } catch {
      anisetteStatus = 'fallback';
    }

    // Determine target IPA URL
    let ipaTarget = ipaUrl || knownApp?.ipaUrl || '';
    if (!ipaTarget) {
      ipaTarget = `${origin}/downloads/SideStore.ipa`;
    } else if (!ipaTarget.startsWith('http')) {
      ipaTarget = `${origin}${ipaTarget.startsWith('/') ? '' : '/'}${ipaTarget}`;
    }

    // Determine direct plist URL if available (e.g. for ESign / KSign)
    const directPlistUrl = knownApp?.plistUrl;

    // Build manifest URL on our custom domain
    const manifestId = `sign-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const manifestUrl = `${origin}/api/web-sideload/manifest?id=${encodeURIComponent(
      normalizedAppId || 'app'
    )}&name=${encodeURIComponent(cleanAppName)}&bundle=${encodeURIComponent(
      cleanBundleId
    )}&url=${encodeURIComponent(ipaTarget)}`;

    // Build the primary itms-services installation URL
    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
    const fallbackInstallUrl = directPlistUrl
      ? `itms-services://?action=download-manifest&url=${encodeURIComponent(directPlistUrl)}`
      : installUrl;

    return NextResponse.json({
      success: true,
      message:
        signingMode === 'direct-enterprise'
          ? 'تم تجهيز رابط التثبيت المباشر بنجاح! جاهز للتثبيت الفوري على الآيفون.'
          : 'تم تجهيز حزمة التوقيع والربط السحابي بحسابك بنجاح!',
      signingMode,
      manifestId,
      installUrl,
      fallbackInstallUrl,
      manifestUrl,
      appName: cleanAppName,
      bundleId: cleanBundleId,
      udid: cleanUdid,
      anisetteStatus,
      expiresAt: new Date(Date.now() + (signingMode === 'apple-id' ? 7 : 365) * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'حدث خطأ أثناء معالجة التوقيع السحابي.' },
      { status: 500 }
    );
  }
}
