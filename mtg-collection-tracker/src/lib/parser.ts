import { Card, Collection, Deck, CardOverlap, DeckAnalysis } from '@/types';

// Parse Archidekt CSV export format
// Format: "Quantity,Name,Set Code,Set Name,Collector Number,Foil,Condition,Language"
export function parseArchidektCSV(csvContent: string): Card[] {
  const lines = csvContent.trim().split('\n');
  const cards: Card[] = [];
  
  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('quantity') || 
                     lines[0]?.toLowerCase().includes('name') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with quotes
    const parts = parseCSVLine(line);
    
    if (parts.length >= 2) {
      const quantity = parseInt(parts[0], 10) || 1;
      const name = cleanCardName(parts[1]);
      
      if (name) {
        cards.push({
          name,
          quantity,
          setCode: parts[2] || undefined,
          setName: parts[3] || undefined,
          collectorNumber: parts[4] || undefined,
          foil: parts[5]?.toLowerCase() === 'true' || parts[5]?.toLowerCase() === 'foil',
          condition: parts[6] || undefined,
          language: parts[7] || undefined,
        });
      }
    }
  }
  
  return cards;
}

// Parse simple deck list format (1 Card Name or Card Name x1)
export function parseDeckList(content: string): Card[] {
  const lines = content.trim().split('\n');
  const cards: Card[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) continue;
    
    // Skip section headers like "Commander", "Mainboard", etc.
    if (trimmedLine.endsWith(':') || /^(commander|mainboard|sideboard|maybeboard)/i.test(trimmedLine)) {
      continue;
    }
    
    let quantity = 1;
    let name = trimmedLine;
    
    // Format: "1 Card Name" or "1x Card Name"
    const match1 = trimmedLine.match(/^(\d+)x?\s+(.+)$/i);
    // Format: "Card Name x1" or "Card Name (1)"
    const match2 = trimmedLine.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
    const match3 = trimmedLine.match(/^(.+?)\s*\((\d+)\)$/);
    
    if (match1) {
      quantity = parseInt(match1[1], 10);
      name = match1[2];
    } else if (match2) {
      name = match2[1];
      quantity = parseInt(match2[2], 10);
    } else if (match3) {
      name = match3[1];
      quantity = parseInt(match3[2], 10);
    }
    
    // Clean up the card name (remove set info in brackets/parentheses)
    name = cleanCardName(name);
    
    if (name && quantity > 0) {
      cards.push({ name, quantity });
    }
  }
  
  return cards;
}

// Clean card name by removing set codes, collector numbers, etc.
// Archidekt format: "Card Name (set) 123 *F* [Category]"
// Also handles: "Card Name ^Have,#37d67a^" category/color codes
export function cleanCardName(name: string): string {
  return name
    // Remove Archidekt category/color codes: ^Have,#37d67a^ or ^Category^
    .replace(/\s*\^[^^]*\^\s*/g, ' ')
    // Remove set code and collector number: (abc) 123 or (abc) 123a
    .replace(/\s*\([a-z0-9]+\)\s*\d+[a-z]?\s*/gi, ' ')
    // Remove trailing brackets with categories: [Artifact], [Land,Creature]
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    // Remove trailing parentheses (any remaining)
    .replace(/\s*\([^)]*\)\s*$/g, '')
    // Remove angle brackets
    .replace(/\s*<[^>]*>\s*$/g, '')
    // Remove foil marker *F*
    .replace(/\s*\*F\*\s*/gi, ' ')
    // Remove any remaining hex color codes like #37d67a
    .replace(/\s*#[0-9a-fA-F]{6}\s*/g, ' ')
    // Clean up multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Auto-detect format and parse
export function parseCardList(content: string): Card[] {
  const firstLine = content.trim().split('\n')[0]?.toLowerCase() || '';
  
  // Check if it looks like CSV (has commas and possibly headers)
  if (firstLine.includes(',') && 
      (firstLine.includes('quantity') || firstLine.includes('name') || firstLine.includes('set'))) {
    return parseArchidektCSV(content);
  }
  
  // Check if it's CSV without headers (starts with number,text)
  if (/^\d+,/.test(content.trim())) {
    return parseArchidektCSV(content);
  }
  
  // Default to deck list format
  return parseDeckList(content);
}

// Normalize card name for comparison (handles split cards, etc.)
export function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\/\/\s*/g, ' // ') // Normalize split card separator
    .replace(/['']/g, "'")          // Normalize apostrophes
    .trim();
}

// Analyze decks for overlapping cards
export function analyzeDeckOverlaps(collection: Collection, decks: Deck[]): DeckAnalysis {
  const cardMap = new Map<string, CardOverlap>();
  
  // Process each deck
  for (const deck of decks) {
    for (const card of deck.cards) {
      // Clean card name to handle legacy data with category codes
      const cleanedName = cleanCardName(card.name);
      const normalizedName = normalizeCardName(cleanedName);
      
      if (!cardMap.has(normalizedName)) {
        cardMap.set(normalizedName, {
          cardName: cleanedName, // Use cleaned name
          totalNeeded: 0,
          owned: 0,
          shortage: 0,
          decks: [],
        });
      }
      
      const overlap = cardMap.get(normalizedName)!;
      overlap.totalNeeded += card.quantity;
      
      // Check if this deck already has an entry for this card
      const existingDeckEntry = overlap.decks.find(d => d.deckName === deck.name);
      if (existingDeckEntry) {
        existingDeckEntry.quantity += card.quantity;
      } else {
        overlap.decks.push({
          deckName: deck.name,
          quantity: card.quantity,
        });
      }
    }
  }
  
  // Calculate owned quantities and shortages
  const collectionMap = new Map<string, number>();
  for (const card of collection.cards) {
    const normalizedName = normalizeCardName(card.name);
    collectionMap.set(normalizedName, (collectionMap.get(normalizedName) || 0) + card.quantity);
  }
  
  for (const [normalizedName, overlap] of cardMap) {
    overlap.owned = collectionMap.get(normalizedName) || 0;
    overlap.shortage = Math.max(0, overlap.totalNeeded - overlap.owned);
  }
  
  // Get cards that appear in multiple decks
  const overlappingCards = Array.from(cardMap.values())
    .filter(card => card.decks.length > 1)
    .sort((a, b) => {
      // Sort by shortage first, then by number of decks
      if (b.shortage !== a.shortage) return b.shortage - a.shortage;
      return b.decks.length - a.decks.length;
    });
  
  // Get cards not owned at all
  const cardsNotOwned = Array.from(cardMap.values())
    .filter(card => card.shortage > 0)
    .sort((a, b) => a.cardName.localeCompare(b.cardName));
  
  const allCards = Array.from(cardMap.values());
  
  return {
    overlappingCards,
    cardsNotOwned,
    totalUniqueCards: allCards.length,
    totalCardsNeeded: allCards.reduce((sum, card) => sum + card.totalNeeded, 0),
    cardsWithShortage: allCards.filter(card => card.shortage > 0).length,
  };
}

// Compute unallocated cards: collection minus all cards used in decks
export function getUnallocatedCards(collection: Collection, decks: Deck[]): Card[] {
  // Build a map of total quantities used across all decks
  const deckUsage = new Map<string, number>();
  for (const deck of decks) {
    for (const card of deck.cards) {
      const normalized = normalizeCardName(cleanCardName(card.name));
      deckUsage.set(normalized, (deckUsage.get(normalized) || 0) + card.quantity);
    }
  }

  // Subtract deck usage from collection
  const result: Card[] = [];
  for (const card of collection.cards) {
    const normalized = normalizeCardName(card.name);
    const used = deckUsage.get(normalized) || 0;
    const remaining = card.quantity - used;
    if (remaining > 0) {
      result.push({ ...card, quantity: remaining });
    }
    // Mark as consumed so duplicates in collection are handled
    if (used > 0) {
      deckUsage.set(normalized, Math.max(0, used - card.quantity));
    }
  }

  return result;
}

// Generate a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
