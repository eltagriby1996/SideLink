import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AnisetteResponse {
  'X-Apple-I-MD': string;
  'X-Apple-I-MD-M': string;
  'X-Apple-I-MD-RINFO'?: string;
  'X-Apple-I-MD-LU'?: string;
  'X-Apple-I-SRL-NO'?: string;
  'X-Apple-Locale'?: string;
  'X-Mme-Client-Info'?: string;
  'X-Mme-Device-Id'?: string;
}

const ANISETTE_SERVERS = [
  'https://ani.sidestore.io',
  'https://anisette.sidestore.io',
  'https://anisette.gq',
  'https://ani.f1sh.me',
];

// In-memory cache for fast response (<50ms)
let cachedAnisette: { data: AnisetteResponse; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

async function fetchFromUpstream(url: string, timeoutMs: number = 4000): Promise<AnisetteResponse | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SideLink-Anisette-Proxy/1.0',
      },
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      if (data && data['X-Apple-I-MD'] && data['X-Apple-I-MD-M']) {
        return {
          'X-Apple-I-MD': data['X-Apple-I-MD'],
          'X-Apple-I-MD-M': data['X-Apple-I-MD-M'],
          'X-Apple-I-MD-RINFO': data['X-Apple-I-MD-RINFO'] || '17106176',
          'X-Apple-I-MD-LU': data['X-Apple-I-MD-LU'] || '',
          'X-Apple-I-SRL-NO': data['X-Apple-I-SRL-NO'] || '0',
          'X-Apple-Locale': data['X-Apple-Locale'] || 'en_US',
          'X-Mme-Client-Info': data['X-Mme-Client-Info'] || '<MacBookPro13,3> <Mac OS X;10.12.6;16G29> <com.apple.AuthKit/1 (com.apple.akd/1.0)>',
          'X-Mme-Device-Id': data['X-Mme-Device-Id'] || data['X-Apple-I-MD-LU'] || '00000000-0000-0000-0000-000000000000',
        };
      }
    }
  } catch { }
  return null;
}

export async function GET(request: NextRequest) {
  // Check fast cache
  const now = Date.now();
  if (cachedAnisette && now - cachedAnisette.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedAnisette.data, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
        'X-SideLink-Cache': 'HIT',
      },
    });
  }

  // Try fetching in parallel or rapid fallback
  for (const server of ANISETTE_SERVERS) {
    const data = await fetchFromUpstream(server);
    if (data) {
      cachedAnisette = { data, timestamp: now };
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
          'X-SideLink-Cache': 'MISS',
        },
      });
    }
  }

  // If all upstreams failed, return emergency fallback with standard structure
  const emergencyData: AnisetteResponse = {
    'X-Apple-I-MD': 'AAABb18xAQAAAAAAAQAAAAMAAACAAAAAAAAAAAAA...',
    'X-Apple-I-MD-M': 'AgAAAADk...',
    'X-Apple-I-MD-RINFO': '17106176',
    'X-Apple-I-MD-LU': '00008020-000E6D583C30003A',
    'X-Apple-I-SRL-NO': '0',
    'X-Apple-Locale': 'en_US',
    'X-Mme-Client-Info': '<MacBookPro13,3> <Mac OS X;10.12.6;16G29> <com.apple.AuthKit/1 (com.apple.akd/1.0)>',
    'X-Mme-Device-Id': '00008020-000E6D583C30003A',
  };

  return NextResponse.json(emergencyData, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'X-SideLink-Cache': 'FALLBACK',
    },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Apple-I-MD',
    },
  });
}
