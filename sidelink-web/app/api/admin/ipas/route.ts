import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security/adminAuth';
import {
  getCuratedIpas,
  addCuratedIpa,
  updateCuratedIpa,
  deleteCuratedIpa,
} from '@/lib/database/adminStore';

export async function GET(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ipas = getCuratedIpas();
  return NextResponse.json({ success: true, ipas });
}

export async function POST(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.downloadUrl) {
      return NextResponse.json({ error: 'اسم التطبيق ورابط التحميل مطلوبان.' }, { status: 400 });
    }

    const created = addCuratedIpa({
      name: body.name,
      bundleId: body.bundleId || 'com.example.app',
      version: body.version || '1.0.0',
      iconUrl: body.iconUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80',
      downloadUrl: body.downloadUrl,
      sizeMb: Number(body.sizeMb) || 50,
      category: body.category || 'Utilities',
      description: body.description || '',
      isFeatured: Boolean(body.isFeatured),
    });

    return NextResponse.json({ success: true, ipa: created, message: 'تمت إضافة تطبيق الـ IPA بنجاح.' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing IPA ID' }, { status: 400 });
    }

    const updated = updateCuratedIpa(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'التطبيق غير موجود.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ipa: updated, message: 'تم تحديث بيانات التطبيق.' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const isAuth = await isAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const ok = deleteCuratedIpa(id);
  return NextResponse.json({ success: ok, message: ok ? 'تم حذف التطبيق بنجاح.' : 'التطبيق غير موجود.' });
}

