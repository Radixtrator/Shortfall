import { Collection, Deck } from '@/types';

const COLLECTION_KEY = 'mtg-collection';
const DECKS_KEY = 'mtg-decks';

export function saveCollection(collection: Collection): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  }
}

export function loadCollection(): Collection {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(COLLECTION_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          uploadedAt: parsed.uploadedAt ? new Date(parsed.uploadedAt) : null,
        };
      }
    } catch (error) {
      console.error('Failed to load collection from localStorage:', error);
      localStorage.removeItem(COLLECTION_KEY);
    }
  }
  return { cards: [], uploadedAt: null };
}

export function saveDecks(decks: Deck[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
  }
}

export function loadDecks(): Deck[] {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(DECKS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.map((deck: Deck) => ({
          ...deck,
          uploadedAt: new Date(deck.uploadedAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load decks from localStorage:', error);
      localStorage.removeItem(DECKS_KEY);
    }
  }
  return [];
}

export function clearAllData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(COLLECTION_KEY);
    localStorage.removeItem(DECKS_KEY);
  }
}
