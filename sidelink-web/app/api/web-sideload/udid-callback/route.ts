import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';

  try {
    const arrayBuffer = await request.arrayBuffer();
    const rawText = Buffer.from(arrayBuffer).toString('utf-8');

    // Extract UDID from XML plist payload
    const udidMatch = rawText.match(/<key>UDID<\/key>\s*<string>([^<]+)<\/string>/i);
    const productMatch = rawText.match(/<key>PRODUCT<\/key>\s*<string>([^<]+)<\/string>/i);
    const versionMatch = rawText.match(/<key>VERSION<\/key>\s*<string>([^<]+)<\/string>/i);
    const nameMatch = rawText.match(/<key>DEVICE_NAME<\/key>\s*<string>([^<]+)<\/string>/i);

    const udid = udidMatch ? udidMatch[1].trim() : '';
    const product = productMatch ? productMatch[1].trim() : 'iPhone';
    const version = versionMatch ? versionMatch[1].trim() : 'iOS';
    const deviceName = nameMatch ? nameMatch[1].trim() : 'iPhone';

    // According to Apple Profile Service specification, response MUST be 301 Moved Permanently
    const redirectUrl = new URL(`${origin}/`);
    if (udid) {
      redirectUrl.searchParams.set('udid', udid);
      redirectUrl.searchParams.set('model', product);
      redirectUrl.searchParams.set('version', version);
      redirectUrl.searchParams.set('device', deviceName);
      redirectUrl.searchParams.set('enrolled', '1');
    }

    return NextResponse.redirect(redirectUrl.toString(), 301);
  } catch (error) {
    return NextResponse.redirect(`${origin}/?error=enroll_failed`, 301);
  }
}

// Fallback GET route in case user visits directly
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin || 'https://www.sidelinktool.me';
  return NextResponse.redirect(`${origin}/`, 302);
}

