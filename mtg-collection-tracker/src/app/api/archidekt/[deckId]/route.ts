import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await params;

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    );
  }

  if (!/^\d+$/.test(deckId)) {
    return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://archidekt.com/api/decks/${deckId}/`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Shortfall/1.0 (MTG deck conflict checker)',
        },
        // Cache for 5 minutes to be friendly to Archidekt's API
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Archidekt API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying Archidekt request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Archidekt' },
      { status: 502 }
    );
  }
}
