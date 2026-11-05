import { NextRequest, NextResponse } from 'next/server';
import { getAdsConfig, updateAdsConfig, AdsConfig } from '@/lib/database/adminStore';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = updateAdsConfig(body);
    return NextResponse.json({
      success: true,
      message: 'تم حفظ وتحديث إعدادات الإعلانات بنجاح!',
      ads: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update ads configuration' },
      { status: 500 }
    );
  }
}
