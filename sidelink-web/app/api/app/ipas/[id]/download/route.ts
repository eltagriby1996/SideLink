import { NextRequest, NextResponse } from 'next/server';
import { getCuratedIpas, incrementIpaDownload } from '@/lib/database/adminStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ipas = getCuratedIpas();
  const ipa = ipas.find((i) => i.id === id);

  if (!ipa) {
    return NextResponse.json({ error: 'IPA not found' }, { status: 404 });
  }

  incrementIpaDownload(id);

  // If redirect requested
  const url = new URL(request.url);
  if (url.searchParams.get('redirect') === 'true') {
    return NextResponse.redirect(ipa.downloadUrl);
  }

  return NextResponse.json({
    success: true,
    downloadUrl: ipa.downloadUrl,
    downloadsCount: ipa.downloadsCount + 1,
  });
}
