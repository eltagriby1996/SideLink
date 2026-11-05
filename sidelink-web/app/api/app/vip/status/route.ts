import { NextRequest, NextResponse } from 'next/server';
import { checkVipKeyStatus, getRemoteConfig, isIpBlocked } from '@/lib/database/adminStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (isIpBlocked(ip)) {
      return NextResponse.json(
        { success: true, valid: false, reason: 'تم حظر جهازك أو عنوان الـ IP من قبل الإدارة.' },
        { status: 403 }
      );
    }

    const config = getRemoteConfig();
    if (config.emergencyKillSwitch) {
      return NextResponse.json({
        success: true,
        valid: false,
        killSwitch: true,
        reason: config.killSwitchMessage || 'تم إيقاف التطبيق مؤقتاً لأعمال الصيانة والتطوير الأمني.',
      });
    }

    const body = await request.json().catch(() => ({}));
    const key = body.key;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ success: true, valid: false, reason: 'المفتاح غير موجود.' }, { status: 400 });
    }

    const status = checkVipKeyStatus(key);
    return NextResponse.json({
      success: true,
      valid: status.isValid,
      reason: status.reason,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
