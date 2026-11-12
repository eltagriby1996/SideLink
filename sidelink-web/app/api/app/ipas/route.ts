import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllIpaSources } from '@/lib/scraper/ipaScraper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const refresh = searchParams.get('refresh') === 'true';

    let apps = await scrapeAllIpaSources(refresh);

    if (category && category !== 'all') {
      apps = apps.filter((a) => a.category === category);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      apps = apps.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.features.some((f) => f.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      count: apps.length,
      apps,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch scraped IPAs' },
      { status: 500 }
    );
  }
}
