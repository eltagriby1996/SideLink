import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';

  const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${origin}/api/web-sideload/udid-callback</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>PRODUCT</string>
      <string>VERSION</string>
      <string>DEVICE_NAME</string>
    </array>
  </dict>
  <key>PayloadOrganization</key>
  <string>SideLink iOS Studio</string>
  <key>PayloadDisplayName</key>
  <string>SideLink — جلب معرّف الآيفون (UDID)</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadUUID</key>
  <string>7A6F5C6D-9E8D-4F12-885E-5D3E3A6C9911</string>
  <key>PayloadIdentifier</key>
  <string>me.sidelinktool.enroll</string>
  <key>PayloadDescription</key>
  <string>جلب معرّف جهازك (UDID) تلقائياً لتوقيع وتثبيت تطبيقات IPA على الآيفون مباشرة بدون كمبيوتر.</string>
  <key>PayloadType</key>
  <string>Profile Service</string>
</dict>
</plist>`;

  return new NextResponse(profileXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sidelink-enroll.mobileconfig"',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}

