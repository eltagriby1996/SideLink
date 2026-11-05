import { NextResponse } from 'next/server';
import { getAdsConfig } from '@/lib/database/adminStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ads = getAdsConfig();
    return NextResponse.json({
      success: true,
      ads,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ads configuration' },
      { status: 500 }
    );
  }
}
