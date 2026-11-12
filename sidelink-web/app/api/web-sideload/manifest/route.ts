import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || 'sidelink-app';
  const name = searchParams.get('name') || 'SideLink App';
  const bundle = searchParams.get('bundle') || 'com.sidelink.cloudapp';

  const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';
  let ipaUrl = searchParams.get('url');
  if (!ipaUrl) {
    ipaUrl = `${origin}/downloads/SideStore.ipa`;
  } else if (!ipaUrl.startsWith('http')) {
    ipaUrl = `${origin}${ipaUrl.startsWith('/') ? '' : '/'}${ipaUrl}`;
  }

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
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${bundle}</string>
        <key>bundle-version</key>
        <string>1.0.0</string>
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
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
