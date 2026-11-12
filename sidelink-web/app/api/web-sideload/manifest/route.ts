import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KNOWN_PACKAGES: Record<string, { bundle: string; name: string; url: string }> = {
  esign: {
    bundle: 'com.khoindvn.esignvietnamrubber',
    name: 'ESign',
    url: 'https://website.khoindvn.io.vn/apps/5jv3w.ipa',
  },
  ksign: {
    bundle: 'com.khoindvn.ksignvietnamrubber',
    name: 'KSign',
    url: 'https://website.khoindvn.io.vn/apps/l8vr7.ipa',
  },
  sidestore: {
    bundle: 'com.SideStore.SideStore',
    name: 'SideStore',
    url: '/downloads/SideStore.ipa',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').toLowerCase();
  const known = KNOWN_PACKAGES[id];

  const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';
  const name = searchParams.get('name') || known?.name || 'SideLink App';
  const bundle = searchParams.get('bundle') || known?.bundle || 'com.sidelink.cloudapp';
  const version = searchParams.get('version') || '1.0.0';

  let ipaUrl = searchParams.get('url') || known?.url || `${origin}/downloads/SideStore.ipa`;
  if (!ipaUrl.startsWith('http')) {
    ipaUrl = `${origin}${ipaUrl.startsWith('/') ? '' : '/'}${ipaUrl}`;
  }

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
          <string>${ipaUrl}</string>
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
        <string>${bundle}</string>
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
