// Types for the MTG Collection Tracker

export interface Card {
  name: string;
  quantity: number;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  foil?: boolean;
  condition?: string;
  language?: string;
  maybeboard?: boolean;
}

export interface Deck {
  id: string;
  name: string;
  cards: Card[];
  uploadedAt: Date;
  archidektId?: string;
}

export interface Collection {
  cards: Card[];
  uploadedAt: Date | null;
}

export interface CardOverlap {
  cardName: string;
  totalNeeded: number;
  owned: number;
  shortage: number;
  decks: {
    deckName: string;
    quantity: number;
  }[];
}

export interface DeckAnalysis {
  overlappingCards: CardOverlap[];
  cardsNotOwned: CardOverlap[];
  totalUniqueCards: number;
  totalCardsNeeded: number;
  cardsWithShortage: number;
}
