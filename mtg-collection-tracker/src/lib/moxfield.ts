import { Card } from '@/types';

/**
 * Extract the deck ID from a Moxfield URL.
 * Supports formats like:
 *   https://www.moxfield.com/decks/abc123def456
 *   https://moxfield.com/decks/abc123def456
 *   moxfield.com/decks/abc123def456
 */
export function extractMoxfieldDeckId(input: string): string | null {
  const trimmed = input.trim();

  const match = trimmed.match(/moxfield\.com\/decks\/([\w-]+)/i);
  return match ? match[1] : null;
}

interface MoxfieldCardEntry {
  quantity: number;
  card: {
    name: string;
    set: string;
    set_name: string;
    cn: string;
  };
}

interface MoxfieldBoard {
  [cardKey: string]: MoxfieldCardEntry;
}

interface MoxfieldDeckResponse {
  id: string;
  publicId: string;
  name: string;
  mainboard: MoxfieldBoard;
  commanders: MoxfieldBoard;
  companions: MoxfieldBoard;
  sideboard: MoxfieldBoard;
  maybeboard: MoxfieldBoard;
}

function boardToCards(board: MoxfieldBoard, maybeboard?: boolean): Card[] {
  return Object.values(board).map((entry) => ({
    name: entry.card.name,
    quantity: entry.quantity,
    setCode: entry.card.set || undefined,
    setName: entry.card.set_name || undefined,
    collectorNumber: entry.card.cn || undefined,
    maybeboard: maybeboard || undefined,
  }));
}

/**
 * Fetch a deck from the Moxfield API via our proxy route.
 */
export async function fetchMoxfieldDeck(
  deckId: string,
): Promise<{ name: string; cards: Card[]; commanderName?: string }> {
  const response = await fetch(`/api/moxfield/${encodeURIComponent(deckId)}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Deck not found. Make sure the URL is correct and the deck is public.');
    }
    throw new Error(`Failed to fetch deck (HTTP ${response.status})`);
  }

  const data: MoxfieldDeckResponse = await response.json();

  const cards: Card[] = [
    ...boardToCards(data.commanders ?? {}),
    ...boardToCards(data.companions ?? {}),
    ...boardToCards(data.mainboard ?? {}),
    ...boardToCards(data.sideboard ?? {}),
    ...boardToCards(data.maybeboard ?? {}, true),
  ];

  // The first commander entry is the commander
  const commanderEntries = Object.values(data.commanders ?? {});
  const commanderName = commanderEntries.length > 0 ? commanderEntries[0].card.name : undefined;

  return { name: data.name, cards, commanderName };
}
