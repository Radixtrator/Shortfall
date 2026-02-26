'use client';

import { useState } from 'react';
import { Deck } from '@/types';

interface DeckListProps {
  decks: Deck[];
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRefresh: (id: string) => Promise<void>;
}

export default function DeckList({ decks, onRemove, onRename, onReorder, onRefresh }: DeckListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await onRefresh(id);
    } finally {
      setRefreshingId(null);
    }
  };

  const startEditing = (deck: Deck) => {
    setEditingId(deck.id);
    setEditName(deck.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  if (decks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No decks uploaded yet.</p>
        <p className="text-sm mt-1">Upload your deck lists above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {decks.map((deck, index) => (
        <div
          key={deck.id}
          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group"
        >
          {/* Reorder buttons */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onReorder(index, index - 1)}
              disabled={index === 0}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move up"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => onReorder(index, index + 1)}
              disabled={index === decks.length - 1}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Move down"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Deck info */}
          <div className="flex-1 min-w-0">
            {editingId === deck.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-medium text-gray-900 dark:text-white truncate">{deck.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {deck.cards.length} unique cards • {deck.cards.reduce((sum, c) => sum + c.quantity, 0)} total
                </p>
              </>
            )}
          </div>

          {/* Action buttons */}
          {editingId !== deck.id && (
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {deck.archidektId && (
                <button
                  onClick={() => handleRefresh(deck.id)}
                  disabled={refreshingId === deck.id}
                  className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 disabled:opacity-50 transition-colors"
                  title="Refresh from Archidekt"
                  aria-label="Refresh from Archidekt"
                >
                  <svg className={`w-4 h-4 ${refreshingId === deck.id ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => startEditing(deck)}
                className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                title="Rename deck"
                aria-label="Rename deck"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove "${deck.name}"? This cannot be undone.`)) {
                    onRemove(deck.id);
                  }
                }}
                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="Remove deck"
                aria-label="Remove deck"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
