import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await params;

  if (!/^\d+$/.test(deckId)) {
    return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://archidekt.com/api/decks/${deckId}/`,
      {
        headers: {
          Accept: 'application/json',
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
