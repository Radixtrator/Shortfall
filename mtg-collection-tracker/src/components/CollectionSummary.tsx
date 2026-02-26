'use client';

import { Collection, Deck } from '@/types';
import { getUnallocatedCards } from '@/lib/parser';

interface CollectionSummaryProps {
  collection: Collection;
  decks: Deck[];
  onClear: () => void;
}

export default function CollectionSummary({ collection, decks, onClear }: CollectionSummaryProps) {
  if (!collection.uploadedAt || collection.cards.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <p>No collection uploaded yet.</p>
        <p className="text-sm mt-1">Export your collection from Archidekt and upload it here.</p>
      </div>
    );
  }

  const totalCards = collection.cards.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueCards = collection.cards.length;

  const exportUnallocated = () => {
    const unallocated = getUnallocatedCards(collection, decks);
    if (unallocated.length === 0) {
      alert('No unallocated cards to export! All your cards are used in decks.');
      return;
    }
    const content = unallocated
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => `${c.quantity} ${c.name}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unallocated-cards.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const unallocated = getUnallocatedCards(collection, decks);
  const unallocatedTotal = unallocated.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Your Collection</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {uniqueCards.toLocaleString()} unique cards • {totalCards.toLocaleString()} total
          </p>
          {decks.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              {unallocated.length.toLocaleString()} unique unallocated • {unallocatedTotal.toLocaleString()} total free
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Uploaded {new Date(collection.uploadedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {decks.length > 0 && (
            <button
              onClick={exportUnallocated}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
              title="Export cards not used in any deck"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Free Cards
            </button>
          )}
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
