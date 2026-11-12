import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PackageDef {
  bundle: string;
  name: string;
  url: string;
}

const VERIFIED_PACKAGES: Record<string, PackageDef> = {
  esign: {
    bundle: 'com.egoz.mdt.vrggr.04',
    name: 'ESign SideLink Edition',
    url: 'https://website.khoindvn.io.vn/apps/5jv3w.ipa',
  },
  'esign-vietnam': {
    bundle: 'com.egoz.mdt.vrggr.04',
    name: 'ESign Viet Nam Rubber',
    url: 'https://website.khoindvn.io.vn/apps/5jv3w.ipa',
  },
  'esign-powerchina': {
    bundle: 'com.SVwaR1.4ujc50',
    name: 'ESign PowerChina',
    url: 'https://website.khoindvn.io.vn/apps/ycmpo.ipa',
  },
  ksign: {
    bundle: 'com.egoz.mdt.vrggr.04',
    name: 'KSign SideLink Edition',
    url: 'https://website.khoindvn.io.vn/apps/l8vr7.ipa',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').toLowerCase();
  const known = VERIFIED_PACKAGES[id] || VERIFIED_PACKAGES['esign'];

  const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';
  const name = searchParams.get('name') || known.name;
  
  // CRITICAL FOR IOS: The bundle identifier MUST exactly match the CFBundleIdentifier inside the signed IPA!
  // If an external signed IPA url is passed, match its known bundle, otherwise use known.bundle.
  let targetUrl = searchParams.get('url') || known.url;
  let targetBundle = known.bundle;

  if (targetUrl.includes('5jv3w.ipa')) {
    targetBundle = 'com.egoz.mdt.vrggr.04';
  } else if (targetUrl.includes('l8vr7.ipa')) {
    targetBundle = 'com.egoz.mdt.vrggr.04';
  } else if (targetUrl.includes('ycmpo.ipa') || targetUrl.includes('powerchina')) {
    targetBundle = 'com.SVwaR1.4ujc50';
  } else if (searchParams.get('bundle')) {
    targetBundle = searchParams.get('bundle')!;
  }

  // Ensure absolute HTTPS URL for the IPA
  if (!targetUrl.startsWith('http')) {
    targetUrl = `${origin}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`;
  }

  const version = searchParams.get('version') || '5.0.2';
  const iconUrl = `${origin}/logo.png`;

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${targetUrl}</string>
        </dict>
        <dict>
          <key>kind</key>
          <string>display-image</string>
          <key>needs-shine</key>
          <false/>
          <key>url</key>
          <string>${iconUrl}</string>
        </dict>
        <dict>
          <key>kind</key>
          <string>full-size-image</string>
          <key>needs-shine</key>
          <false/>
          <key>url</key>
          <string>${iconUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${targetBundle}</string>
        <key>bundle-version</key>
        <string>${version}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${name}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

  return new NextResponse(plist, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-plist; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
