import { Card } from '@/types';

/**
 * Extract the deck ID from an Archidekt URL.
 * Supports formats like:
 *   https://archidekt.com/decks/12345
 *   https://archidekt.com/decks/12345/deck-name
 *   https://www.archidekt.com/decks/12345
 *   archidekt.com/decks/12345
 *   12345  (raw ID)
 */
export function extractDeckId(input: string): string | null {
  const trimmed = input.trim();

  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // URL pattern
  const match = trimmed.match(/archidekt\.com\/(?:api\/)?decks\/(\d+)/i);
  return match ? match[1] : null;
}

interface ArchidektCard {
  quantity: number;
  card: {
    oracleCard: {
      name: string;
    };
    edition: {
      editioncode: string;
      name: string;
    };
    collectorNumber?: string;
  };
  categories: string[];
}

interface ArchidektDeckResponse {
  id: number;
  name: string;
  cards: ArchidektCard[];
}

/**
 * Fetch a deck from the Archidekt API via our proxy route.
 */
export async function fetchArchidektDeck(deckId: string): Promise<{ name: string; cards: Card[] }> {
  const response = await fetch(`/api/archidekt/${deckId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Deck not found. Make sure the URL or ID is correct and the deck is public.');
    }
    throw new Error(`Failed to fetch deck (HTTP ${response.status})`);
  }

  const data: ArchidektDeckResponse = await response.json();

  const cards: Card[] = data.cards
    .filter((c) => {
      // Skip "Maybeboard" cards – they aren't actually in the deck
      const cats = c.categories.map((cat) => cat.toLowerCase());
      return !cats.includes('maybeboard');
    })
    .map((c) => ({
      name: c.card.oracleCard.name,
      quantity: c.quantity,
      setCode: c.card.edition?.editioncode || undefined,
      setName: c.card.edition?.name || undefined,
      collectorNumber: c.card.collectorNumber || undefined,
    }));

  return { name: data.name, cards };
}
