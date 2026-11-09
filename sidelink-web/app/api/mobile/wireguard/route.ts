import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const udid = searchParams.get('udid') || 'Device';

  // Standard SideStore / Loopback WireGuard Profile
  const wgConfig = `[Interface]
PrivateKey = aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Address = 10.7.0.1/24
DNS = 127.0.0.1

[Peer]
PublicKey = aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
AllowedIPs = 10.7.0.0/24
Endpoint = 127.0.0.1:51820
PersistentKeepalive = 25
`;

  const format = searchParams.get('format');
  if (format === 'json') {
    return NextResponse.json({
      success: true,
      config: wgConfig,
      name: `SideLink-Loopback-${udid.slice(0, 8)}`,
    });
  }

  return new NextResponse(wgConfig, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="SideLink-Loopback.conf"`,
      'Cache-Control': 'no-cache',
    },
  });
}
