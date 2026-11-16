import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'sidelink-antirevoke.mobileconfig');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sidelink-antirevoke.mobileconfig"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to serve DNS profile' }, { status: 500 });
  }
}

