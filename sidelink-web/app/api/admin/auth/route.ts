import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ authenticated: true, role: 'super-admin' });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'تم الدخول المباشر بنجاح.',
    token: 'admin-authorized-direct',
  });
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}
