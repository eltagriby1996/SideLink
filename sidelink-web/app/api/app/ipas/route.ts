import { NextResponse } from 'next/server';
import { getCuratedIpas } from '@/lib/database/adminStore';

export async function GET() {
  const ipas = getCuratedIpas();
  return NextResponse.json({
    success: true,
    count: ipas.length,
    ipas,
  });
}
